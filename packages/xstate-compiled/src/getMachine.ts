import * as babel from '@babel/core';
import * as XState from 'xstate';
import * as ts from 'typescript';
import {
  actions,
  assign,
  interpret,
  Machine,
  send,
  sendParent,
  spawn,
} from 'xstate';
import { raise } from 'xstate/lib/actions';

export const getMachine = async ({
  fileContents,
  filePath,
}: {
  filePath: string;
  fileContents: string;
}) => {
  const fileWithoutImports = fileContents
    .split('\n')
    .filter((line) => !/^import/.test(line))
    .join('\n')
    .replace(/export /g, '')
    .replace(
      /(const|let|var) (\w{1,}) = (Machine|createMachine)/,
      'const machine = Machine',
    );

  const node = ts.createSourceFile(
    filePath,
    fileContents,
    ts.ScriptTarget.Latest,
  );

  let id: string;

  const transformer = <T extends ts.Node>(
    context: ts.TransformationContext,
  ) => (rootNode: T) => {
    function visit(node: ts.Node): ts.Node {
      // if (ts.isVariableDeclaration(node)) {
      // }
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        /^(Machine|createMachine)$/.test(node.expression.escapedText as string)
      ) {
        if (!node.typeArguments) {
          console.log('You must pass three type arguments to your machine.');
          console.log();
          console.log('For instance:');
          console.log(
            `const machine = ${node.expression.escapedText}<Context, Event, 'aUniqueIdForYourMachine'>({})`,
          );
          console.log();
          throw new Error(
            'You must pass three type arguments to your machine.',
          );
        }
        const idNode = node.typeArguments[2];

        if (ts.isLiteralTypeNode(idNode)) {
          // @ts-ignore
          id = idNode.literal.text;
        }
      }
      return ts.visitEachChild(node, visit, context);
    }
    return ts.visitNode(rootNode, visit);
  };

  ts.transform(node, [transformer]);

  if (!id) {
    console.log(
      'Could not find a valid id property passed in as a type declaration on your Machine.',
    );
  }

  const parsedFile = babel.transform(fileWithoutImports, {
    filename: filePath,
    plugins: [
      '@babel/plugin-transform-typescript',
      '@babel/plugin-proposal-optional-chaining',
    ],
  });

  const func = new Function(
    'Machine',
    'interpret',
    'assign',
    'send',
    'sendParent',
    'spawn',
    'raise',
    'actions',
    'XState',
    `${(parsedFile || {}).code}; return machine;`,
  );

  let machine: XState.StateNode;

  machine = func(
    Machine,
    interpret,
    assign,
    send,
    sendParent,
    spawn,
    raise,
    actions,
    XState,
  );

  return {
    id,
    machine,
  };
};
