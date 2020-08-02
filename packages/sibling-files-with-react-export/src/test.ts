import * as ts from 'typescript';
import fs from 'fs';

const node = ts.createSourceFile(
  'example-machines/addUserMachine.machine.ts',
  fs.readFileSync('./example-machines/addUserMachine.machine.ts').toString(),
  ts.ScriptTarget.Latest,
);

// const visitor: ts.Visitor = (node) => {
//   return node;
// };

// const findMachineDeclaration = (
//   source: ts.SourceFile,
//   context: ts.TransformationContext,
// ): ts.Node | undefined => {
//   ts.visitEachChild(source, visitor, context);
//   return undefined;
// };

const transformer = <T extends ts.Node>(context: ts.TransformationContext) => (
  rootNode: T,
) => {
  function visit(node: ts.Node): ts.Node {
    // if (ts.isVariableDeclaration(node)) {
    // }
    if (ts.isCallExpression(node)) {
      console.log(node.typeArguments);
    }
    return ts.visitEachChild(node, visit, context);
  }
  return ts.visitNode(rootNode, visit);
};

ts.transform(node, [transformer]);

// const findFirstStatement = (node: ts.Node) => {
//   if (node.kind === ts.SyntaxKind.FirstStatement) {
//     node.forEachChild(findVariableDeclarationList);
//   }
// };

// const findVariableDeclarationList = (node: ts.Node) => {
//   if (node.kind === ts.SyntaxKind.VariableDeclarationList) {
//     node.forEachChild((child) => {
//       // console.log((child.name as ts.Identifier).escapedText);
//       // console.log((child.initializer.expression as ts.Identifier).escapedText);
//       const hasInitializer = ts.hasOnlyExpressionInitializer(child);

//       if (hasInitializer) {
//         console.log(
//           ((child as any).initializer as ts.HasExpressionInitializer)
//           // @ts-ignore
//             .typeArguments,
//         );
//       }
//     });
//   }
// };

// const machine = findMachineDeclaration(node);
