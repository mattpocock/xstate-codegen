import * as babelCore from '@babel/core';
import { Scope } from '@babel/traverse';
import splitExportDeclaration from '@babel/helper-split-export-declaration';
import path from 'path';
import babelPluginMacros, { createMacro } from 'babel-plugin-macros';
import { StateMachine } from 'xstate';
import { rollup } from 'rollup';
import babelPlugin from '@rollup/plugin-babel';
import nodeResolvePlugin from '@rollup/plugin-node-resolve';
import Module from 'module';

const generateRandomId = (): string =>
  Math.random()
    .toString(36)
    .substring(2);

const generateUniqueId = (map: Record<string, any>): string => {
  const id = generateRandomId();
  return Object.prototype.hasOwnProperty.call(map, id)
    ? generateUniqueId(map)
    : id;
};

const compiledOutputs: Record<string, string> = Object.create(null);
(Module as any)._extensions['.xstate.js'] = (module: any, filename: string) => {
  const [_match, id] = filename.match(/-(\w+)\.xstate\.js$/)!;
  module._compile(compiledOutputs[id], filename);
};

type UsedImport = {
  localName: string;
  importedName: string;
};

type ReferencePathsByImportName = Record<
  string,
  Array<babelCore.NodePath<babelCore.types.Node>>
>;

const cwd = process.cwd();
const extensions = ['.tsx', '.ts', '.jsx', '.js'];

const getImports = (
  { types: t }: typeof babelCore,
  path: babelCore.NodePath<babelCore.types.ImportDeclaration>,
): UsedImport[] => {
  return path.node.specifiers.map((specifier) => {
    if (t.isImportNamespaceSpecifier(specifier)) {
      throw new Error(
        'Using a namespace import for `@xstate/import` is not supported.',
      );
    }
    return {
      localName: specifier.local.name,
      importedName:
        specifier.type === 'ImportDefaultSpecifier'
          ? 'default'
          : specifier.local.name,
    };
  });
};

const getReferencePathsByImportName = (
  scope: Scope,
  imports: UsedImport[],
): ReferencePathsByImportName | undefined => {
  let shouldExit = false;
  let hasReferences = false;
  const referencePathsByImportName = imports.reduce(
    (byName, { importedName, localName }) => {
      let binding = scope.getBinding(localName);
      if (!binding) {
        shouldExit = true;
        return byName;
      }
      byName[importedName] = binding.referencePaths;
      hasReferences = hasReferences || Boolean(byName[importedName].length);
      return byName;
    },
    {} as ReferencePathsByImportName,
  );

  if (!hasReferences || shouldExit) {
    return;
  }

  return referencePathsByImportName;
};

const getMachineId = (
  importName: string,
  { types: t }: typeof babelCore,
  callExpression: babelCore.types.CallExpression,
) => {
  const { typeParameters } = callExpression;

  if (
    !typeParameters ||
    !typeParameters.params[2] ||
    !t.isTSLiteralType(typeParameters.params[2]) ||
    !t.isStringLiteral(typeParameters.params[2].literal)
  ) {
    console.log('You must pass three type arguments to your machine.');
    console.log();
    console.log('For instance:');
    console.log(
      `const machine = ${importName}<Context, Event, 'aUniqueIdForYourMachine'>({})`,
    );
    console.log();
    throw new Error('You must pass three type arguments to your machine.');
  }
  return typeParameters.params[2].literal.value;
};

const insertExtractingExport = (
  { types: t }: typeof babelCore,
  statementPath: babelCore.NodePath<babelCore.types.Statement>,
  {
    importName,
    index,
    machineId,
    machineIdentifier,
  }: {
    importName: string;
    index: number;
    machineId: string;
    machineIdentifier: string;
  },
) => {
  statementPath.insertAfter(
    t.exportNamedDeclaration(
      t.variableDeclaration('var', [
        t.variableDeclarator(
          t.identifier(`__xstate_${importName}_${index}`),
          t.objectExpression([
            t.objectProperty(t.identifier('id'), t.stringLiteral(machineId)),
            t.objectProperty(
              t.identifier('machine'),
              t.identifier(machineIdentifier),
            ),
          ]),
        ),
      ]),
    ),
  );
};

const handleMachineFactoryCalls = (
  importName: string,
  { references, babel }: babelPluginMacros.MacroParams,
) => {
  if (!references[importName]) {
    return;
  }

  const { types: t } = babel;

  references[importName].forEach((referencePath, index) => {
    const callExpressionPath = referencePath.parentPath;

    if (!t.isCallExpression(callExpressionPath.node)) {
      throw new Error(`\`${importName}\` can only be called.`);
    }
    const machineId = getMachineId(importName, babel, callExpressionPath.node);

    const callExpressionParentPath = callExpressionPath.parentPath;
    const callExpressionParentNode = callExpressionParentPath.node;

    switch (callExpressionParentNode.type) {
      case 'VariableDeclarator': {
        if (!t.isIdentifier(callExpressionParentNode.id)) {
          throw new Error(
            `Result of the \`${importName}\` call can only appear in the variable declaration.`,
          );
        }
        const statementPath = callExpressionParentPath.getStatementParent();
        if (!statementPath.parentPath.isProgram()) {
          throw new Error(
            `\`${importName}\` calls can only appear in top-level statements.`,
          );
        }

        insertExtractingExport(babel, statementPath, {
          importName,
          index,
          machineId,
          machineIdentifier: callExpressionParentNode.id.name,
        });

        break;
      }
      case 'ExportDefaultDeclaration': {
        splitExportDeclaration(callExpressionParentPath);

        insertExtractingExport(
          babel,
          callExpressionParentPath.getStatementParent(),
          {
            importName,
            index,
            machineId,
            machineIdentifier: ((callExpressionParentPath as babelCore.NodePath<
              babelCore.types.VariableDeclaration
            >).node.declarations[0].id as babelCore.types.Identifier).name,
          },
        );
        break;
      }
      default: {
        throw new Error(
          `\`${importName}\` calls can only appear in the variable declaration or as a default export.`,
        );
      }
    }
  });
};

const macro = createMacro((params) => {
  handleMachineFactoryCalls('createMachine', params);
  handleMachineFactoryCalls('Machine', params);
});

type ExtractedMachine = {
  id: string;
  machine: StateMachine<any, any, any>;
};

const getCreatedExports = (
  importName: string,
  exportsObj: Record<string, any>,
): ExtractedMachine[] => {
  const extracted: ExtractedMachine[] = [];
  let counter = 0;
  while (true) {
    const currentCandidate = exportsObj[`__xstate_${importName}_${counter++}`];
    if (!currentCandidate) {
      return extracted;
    }
    extracted.push(currentCandidate);
  }
};

export const extractMachines = async (
  filePath: string,
): Promise<ExtractedMachine[]> => {
  const resolvedFilePath = path.resolve(cwd, filePath);

  const build = await rollup({
    input: resolvedFilePath,
    external: (id) => !id.startsWith('.'),
    plugins: [
      nodeResolvePlugin({
        extensions,
      }),
      babelPlugin({
        babelHelpers: 'bundled',
        extensions,
        plugins: [
          '@babel/plugin-transform-typescript',
          '@babel/plugin-proposal-optional-chaining',
          (babel: typeof babelCore) => {
            return {
              name: 'xstate-codegen-machines-extractor',
              visitor: {
                ImportDeclaration(
                  path: babelCore.NodePath<babelCore.types.ImportDeclaration>,
                  state: babelCore.PluginPass,
                ) {
                  if (
                    state.filename !== resolvedFilePath ||
                    path.node.source.value !== '@xstate/compiled'
                  ) {
                    return;
                  }

                  const imports = getImports(babel, path);
                  const referencePathsByImportName = getReferencePathsByImportName(
                    path.scope,
                    imports,
                  );

                  if (!referencePathsByImportName) {
                    return;
                  }

                  /**
                   * Other plugins that run before babel-plugin-macros might use path.replace, where a path is
                   * put into its own replacement. Apparently babel does not update the scope after such
                   * an operation. As a remedy, the whole scope is traversed again with an empty "Identifier"
                   * visitor - this makes the problem go away.
                   *
                   * See: https://github.com/kentcdodds/import-all.macro/issues/7
                   */
                  state.file.scope.path.traverse({
                    Identifier() {},
                  });

                  macro({
                    path,
                    references: referencePathsByImportName,
                    state,
                    babel,
                    // hack to make this call accepted by babel-plugin-macros
                    isBabelMacrosCall: true,
                  });
                },
              },
            };
          },
        ],
      }),
    ],
  });
  const output = await build.generate({
    format: 'cjs',
    exports: 'named',
  });
  const chunk = output.output[0];
  const { code } = chunk;

  // dance with those unique ids is not really needed, at least right now
  // loading CJS modules is synchronous
  // once we start to support loading ESM this won't hold true anymore
  let uniqueId = generateUniqueId(compiledOutputs);

  try {
    compiledOutputs[uniqueId] = code;
    const fakeFileName = path.join(
      path.dirname(resolvedFilePath),
      `${path
        .basename(resolvedFilePath)
        .replace(/\./g, '-')}-${uniqueId}.xstate.js`,
    );
    const module = new Module(fakeFileName);
    (module as any).load(fakeFileName);

    return [
      ...getCreatedExports('createMachine', module.exports),
      ...getCreatedExports('Machine', module.exports),
    ];
  } finally {
    delete compiledOutputs[uniqueId];
  }
};
