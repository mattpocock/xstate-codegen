import path from 'path';
import { StateMachine, Machine } from 'xstate';
import { Project, ts, Node } from 'ts-morph';
import extractConfig, { extractOptions } from './configExtractor';

type ExtractedMachine = {
  id: string;
  machine: StateMachine<any, any, any>;
};

let projectCache = new Map<string, Project>();

export const extractMachines = async (
  filePath: string,
): Promise<ExtractedMachine[]> => {
  const resolvedFilePath = path.resolve(process.cwd(), filePath);

  let configFileName = ts.findConfigFile(resolvedFilePath, ts.sys.fileExists);
  if (!configFileName) {
    throw new Error('No tsconfig.json file could be found');
  }

  let isFreshProject = false;
  if (!projectCache.has(configFileName)) {
    isFreshProject = true;
    const cachedProject = new Project({
      tsConfigFilePath: configFileName,
      addFilesFromTsConfig: false,
    });
    projectCache.set(configFileName, cachedProject);
  }
  let project = projectCache.get(configFileName)!;
  project.addSourceFileAtPath(resolvedFilePath);
  project.resolveSourceFileDependencies();

  if (!isFreshProject) {
    let sourceFiles = project.getSourceFiles();
    for (let sourceFile of sourceFiles) {
      sourceFile.refreshFromFileSystemSync();
    }
  }

  let sourceFile = project.getSourceFileOrThrow(resolvedFilePath);

  const machineReferences = sourceFile
    .getImportDeclarations()
    .filter(
      (importDeclar) =>
        importDeclar.getModuleSpecifierValue() === '@xstate/compiled',
    )
    .flatMap((importDeclar) => {
      if (importDeclar.getNamespaceImport()) {
        throw new Error('Namespace imports are not supported yet.');
      }

      return importDeclar.getNamedImports();
    })
    .filter(
      (namedImport) =>
        namedImport.getNameNode().compilerNode.text === 'Machine',
    )
    .flatMap((namedImport) =>
      (
        namedImport.getAliasNode() || namedImport.getNameNode()
      ).findReferences(),
    )
    .flatMap((references) => references.getReferences())
    .map((reference) => reference.getNode())
    .filter((referenceNode) => {
      if (referenceNode.getSourceFile() !== sourceFile) {
        return false;
      }
      const statement = referenceNode.getFirstAncestor(Node.isStatement);
      return !statement || !Node.isImportDeclaration(statement);
    });

  return machineReferences.map((machineReference) => {
    const machineCall = machineReference.getParent()!;

    if (
      !Node.isCallExpression(machineCall) ||
      machineCall.getExpression() !== machineReference
    ) {
      throw new Error(
        "`Machine` can only be called - you can't pass it around or do anything else with it.",
      );
    }

    const configNode = machineCall.getArguments()[0];
    const [configErr, config] = extractConfig(configNode);

    if (configErr) {
      throw new Error('Could not extract config.');
    }

    const optionsNode = machineCall.getArguments()[1];
    const [optionsErr, options] = extractOptions(optionsNode);

    if (optionsErr) {
      throw new Error('Could not extract options.');
    }

    const secondTypeArg = machineCall.getTypeArguments()[2];

    if (!Node.isLiteralTypeNode(secondTypeArg)) {
      throw new Error(
        'Second type argument passed to `Machine` has to be a string literal.',
      );
    }

    const literal = secondTypeArg.getLiteral();

    if (!Node.isStringLiteral(literal)) {
      throw new Error(
        'Second type argument passed to `Machine` has to be a string literal.',
      );
    }

    return {
      id: literal.getLiteralValue(),
      machine: Machine(config as any, options as any),
    };
  });
};
