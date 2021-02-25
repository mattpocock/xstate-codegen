import path from 'path';
import { StateMachine, createMachine } from 'xstate';
import { Project, ts, Node } from 'ts-morph';
import { extractSchema, extractOptions } from './extractor';

type ExtractedMachine = {
  id: string;
  machine: StateMachine<any, any, any>;
};

let projectCache = new Map<string, Project>();

Array.prototype.flatMap = function(iteratee) {
  return [].concat(...(this.map(iteratee) as any));
};

const getTsPropertyNameText = (propertyName: ts.PropertyName): string => {
  if (
    ts.isIdentifier(propertyName) ||
    ts.isStringLiteral(propertyName) ||
    ts.isNumericLiteral(propertyName)
  ) {
    return propertyName.text;
  }

  if (ts.isComputedPropertyName(propertyName)) {
    throw new Error(
      "Private identifiers can't be used as property names within config object.",
    );
  }

  if (ts.isPrivateIdentifier(propertyName)) {
    throw new Error(
      "Private identifiers can't be used as property names within config object.",
    );
  }

  // propertyName is already never here, but TS doesn't recognize that this explores all possibilities here
  // we have to throw so it doesn't complain about the string return type
  throw new Error('This should be unreachable.');
};

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
      // addFilesFromTsConfig: false,
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
    if (Node.isObjectLiteralExpression(configNode)) {
      configNode.transform((traversal) => {
        if (traversal.currentNode === configNode.compilerNode) {
          return traversal.visitChildren();
        }

        if (
          ts.isPropertyAssignment(traversal.currentNode) &&
          getTsPropertyNameText(traversal.currentNode.name) !== 'context' &&
          (ts.isObjectLiteralExpression(traversal.currentNode.initializer) ||
            ts.isArrayLiteralExpression(traversal.currentNode.initializer) ||
            ts.isStringLiteral(traversal.currentNode.initializer))
        ) {
          return ts.updatePropertyAssignment(
            traversal.currentNode,
            traversal.currentNode.name,
            ts.factory.createAsExpression(
              traversal.currentNode.initializer,
              ts.factory.createTypeReferenceNode(
                ts.factory.createIdentifier('const'),
                undefined,
              ),
            ),
          );
        }

        return traversal.currentNode;
      });
    }

    const stateSchema = extractSchema(configNode.getType());
    const optionsNode = machineCall.getArguments()[1];
    const options = optionsNode && extractOptions(optionsNode.getType());

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
      machine: createMachine(stateSchema as any, options as any),
    };
  });
};
