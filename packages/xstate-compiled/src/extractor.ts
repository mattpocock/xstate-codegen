import path from 'path';
import { Type, Node } from 'ts-morph';

const knownActions = new Set([
  'AssignAction',
  'ChooseAction',
  'LogAction',
  'PureAction',
  'RaiseAction',
  'SendAction',
]);

const findLastIndex = <T>(arr: T[], predicate: (el: T) => boolean): number => {
  for (let index = arr.length - 1; index >= 0; index--) {
    if (predicate(arr[index])) {
      return index;
    }
  }
  return -1;
};

const explodeAbsolutePath = (filePath: string): string[] => {
  if (!path.isAbsolute(filePath)) {
    throw new Error(`Received file path is not an absolute one: ${filePath}`);
  }
  const parsed = path.parse(filePath);
  return [...parsed.dir.slice(parsed.root.length).split(path.sep), parsed.base];
};

const isNodeModulePath = (moduleName: string, absoluteFilePath: string) => {
  if (!moduleName.length) {
    throw new Error('Received `moduleName` has to be non-empty.');
  }

  const explodedPath = explodeAbsolutePath(absoluteFilePath);
  const nodeModulesIndex = findLastIndex(
    explodedPath,
    (segment) => segment === 'node_modules',
  );

  if (nodeModulesIndex === -1) {
    return false;
  }

  if (moduleName[0] === '@') {
    return (
      `${explodedPath[nodeModulesIndex + 1]}/${
        explodedPath[nodeModulesIndex + 2]
      }` === moduleName
    );
  }

  return explodedPath[nodeModulesIndex + 1] === moduleName;
};

const extractFromType = (type: Type): unknown => {
  if (type.isAny() || type.isUnknown()) {
    throw new Error(`Extracting from ${type.getText()} is not supported.`);
  }
  if (type.isString()) {
    throw new Error('Only string literals are allowed.');
  }
  if (type.isStringLiteral()) {
    return (type.compilerType as any).value;
  }
  if (type.isNumber()) {
    throw new Error('Only number literals are allowed.');
  }
  if (type.isNumberLiteral()) {
    return (type.compilerType as any).value;
  }
  if (type.isBoolean()) {
    throw new Error('Only boolean literals are allowed.');
  }
  if (type.isBooleanLiteral()) {
    throw (type.compilerType as any).intrinsicName === 'true';
  }
  if (type.isUndefined()) {
    return undefined;
  }
  if (type.isNull()) {
    return null;
  }
  if (type.isTuple()) {
    return type.getTupleElements().map(extractFromType);
  }
  if (type.isArray()) {
    throw new Error(
      "Extracting values from array types is not supported as it's impossible to reason about order of operations",
    );
  }
  if (type.getCallSignatures().length) {
    return () => {};
  }
  if (type.isObject()) {
    const symbol = type.getSymbol();
    if (!symbol) {
      throw new Error(
        'Could not found a symbol for an object type - please report this to the xstate-codegen team.',
      );
    }
    if (
      knownActions.has(symbol.getName()) &&
      symbol
        .getDeclarations()
        .some((declaration) =>
          isNodeModulePath('xstate', declaration.getSourceFile().getFilePath()),
        )
    ) {
      return () => {};
    }
    if (type.getStringIndexType() || type.getNumberIndexType()) {
      throw new Error('Indexed types are not allowed.');
    }

    const extracted: Record<string, unknown> = {};
    for (const propertySymbol of type.getProperties()) {
      extracted[propertySymbol.getName()] = extractFromType(
        propertySymbol.getValueDeclarationOrThrow().getType(),
      );
    }

    return extracted;
  }

  throw new Error(
    `Extracting values from type such as ${type
      .getSymbolOrThrow()
      .getName()} has not been implemented yet.`,
  );
};

const extractFromNode = (node: Node): unknown => {
  if (
    Node.isStringLiteral(node) ||
    Node.isNumericLiteral(node) ||
    Node.isBooleanLiteral(node)
  ) {
    return node.getLiteralValue();
  }

  if (Node.isNullLiteral(node)) {
    return null;
  }

  if (Node.isObjectLiteralExpression(node)) {
    const extracted: Record<string, unknown> = {};

    for (const property of node.getProperties()) {
      if (Node.isMethodDeclaration(property)) {
        extracted[property.getName()] = () => {};
      } else if (Node.isPropertyAssignment(property)) {
        const initializer = property.getInitializerOrThrow();
        extracted[property.getName()] = Node.isAsExpression(initializer)
          ? extractFromType(initializer.getType())
          : extractFromNode(initializer);
      } else if (Node.isShorthandPropertyAssignment(property)) {
        // dereference identifier ?
        throw new Error();
      } else if (Node.isSpreadAssignment(property)) {
        throw new Error();
      } else if (Node.isGetAccessorDeclaration(property)) {
        throw new Error();
      } else if (Node.isSetAccessorDeclaration(property)) {
        throw new Error();
      }
    }

    return extracted;
  }

  if (Node.isArrayLiteralExpression(node)) {
    return node.getElements().map(extractFromNode);
  }

  if (Node.isArrowFunction(node) || Node.isFunctionExpression(node)) {
    return () => {};
  }

  if (Node.isIdentifier(node)) {
    return extractFromType(node.getType());
  }

  if (Node.isCallExpression(node)) {
    return extractFromType(node.getReturnType());
  }

  throw new Error(
    `Extracting literal value for nodes of type ${node.getKindName()} has not been implemented yet.`,
  );
};

export default extractFromNode;
