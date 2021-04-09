import path from 'path';
import { Type } from 'ts-morph';

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

const isNodeModulePath = (
  moduleName: string,
  absoluteFilePath: string,
): boolean => {
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

const indexer = Symbol('schema.extractor.indexer');

type TypeExtractor = {
  extract: (
    type: Type | undefined,
  ) => [true, undefined] | [false, any, boolean?];
};

const lazy = (getter: () => TypeExtractor): TypeExtractor => ({
  extract: (type: Type | undefined) => getter().extract(type),
});

const object = (
  shape: Record<string | symbol, TypeExtractor>,
): TypeExtractor => ({
  extract(type: Type | undefined) {
    if (!type?.isObject()) {
      return [true, undefined];
    }

    if (type.getStringIndexType() || type.getNumberIndexType()) {
      return [true, undefined];
    }

    const extracted: Record<string, unknown> = {};
    for (const propertySymbol of type.getProperties()) {
      const propName = propertySymbol.getName();
      const propExtractor = shape[propName] || shape[indexer as any];

      if (!propExtractor) {
        // for now ignore properties not known to the shape
        // TODO: rethink if that's the best solution
        // list pros and cons of the extractor being strict versus it only handling what it knows
        continue;
      }

      const [err, value, hasValue] = propExtractor.extract(
        propertySymbol.getValueDeclarationOrThrow().getType(),
      );
      if (err) {
        return [err, undefined];
      }
      if (hasValue) {
        extracted[propName] = value;
      }
    }

    return [false, extracted, true];
  },
});

const optional = (t: TypeExtractor): TypeExtractor => ({
  extract(type: Type | undefined) {
    // TODO: should this accept explicit undefined as well?
    if (!type) {
      return [false, undefined, false];
    }
    return t.extract(type);
  },
});

const array = (typeExtractor: TypeExtractor): TypeExtractor => ({
  extract(type: Type | undefined) {
    if (!type?.isTuple()) {
      return [true, undefined];
    }

    const result = [];

    for (const element of type.getTupleElements()) {
      const [err, value, hasValue] = typeExtractor.extract(element);
      if (err) {
        return [err, undefined];
      }
      if (hasValue) {
        result.push(value);
      }
    }
    return [false, result, true];
  },
});
const match = (candidates: TypeExtractor[]): TypeExtractor => ({
  extract(type: Type | undefined) {
    for (const candidate of candidates) {
      const [, value, hasValue] = candidate.extract(type);
      if (hasValue) {
        return [false, value, true];
      }
    }

    return [true, undefined];
  },
});
const undef = (): TypeExtractor => ({
  extract(type: Type | undefined) {
    if (!type?.isUndefined()) {
      return [true, undefined];
    }
    return [false, undefined, true];
  },
});
const bool = (literal?: boolean): TypeExtractor => ({
  extract(type: Type | undefined) {
    if (!type?.isBooleanLiteral()) {
      return [true, undefined];
    }
    const actual = (type.compilerType as any).intrinsicName === 'true';
    if (literal !== undefined && literal !== actual) {
      return [true, undefined];
    }
    return [false, actual, true];
  },
});
const string = (literals?: string[]): TypeExtractor => ({
  extract(type: Type | undefined) {
    if (!type?.isStringLiteral()) {
      return [true, undefined];
    }

    const literal = (type.compilerType as any).value;
    if (!literals || literals.includes(literal)) {
      return [false, literal, true];
    }
    return [true, undefined];
  },
});

const func = (): TypeExtractor => ({
  extract(type: Type | undefined) {
    if (!type?.getCallSignatures().length) {
      return [true, undefined];
    }
    return [false, () => {}, true];
  },
});

const SingleOrArray = (typeExtractor: TypeExtractor): TypeExtractor =>
  match([typeExtractor, array(typeExtractor)]);

const Action = (): TypeExtractor => ({
  extract(type: Type | undefined) {
    if (!type?.isObject()) {
      return [true, undefined];
    }

    const symbol = type.getSymbol();

    // is this a different case than the one comparing to undefined?
    if (symbol === null) {
      return [true, undefined];
    }

    if (symbol === undefined) {
      // not ideal, this might be an inline action call (like `actions: assign()`)
      // our types might not be generated during the initial run and thus we might not be able to obtain a type
      // from such an import without types defs, we just return a function to imitate an inline function
      return [false, () => {}, true];
    }

    if (
      !knownActions.has(symbol.getName()) ||
      !symbol
        .getDeclarations()
        .some((declaration) =>
          isNodeModulePath('xstate', declaration.getSourceFile().getFilePath()),
        )
    ) {
      return [true, undefined];
    }

    return [false, () => {}, true];
  },
});
const Actions = SingleOrArray(match([string(), func(), Action()]));

const Target = match([undef(), SingleOrArray(string())]);

const Transition = match([
  Target,
  object({
    target: optional(Target),
    cond: optional(match([string(), func()])),
    actions: optional(Actions),
    internal: optional(bool()),
  }),
]);

const TransitionsMap = object({
  [indexer]: SingleOrArray(Transition),
});

const Invoke = SingleOrArray(
  object({
    // TODO: this can be an object with .type
    src: string(),
    id: optional(string()),
    onDone: optional(SingleOrArray(Transition)),
    onError: optional(SingleOrArray(Transition)),
    autoForward: optional(bool()),
    // TODO:
    // data:
  }),
);

const State = object({
  type: optional(
    string(['atomic', 'compound', 'parallel', 'final', 'history']),
  ),
  id: optional(string()),
  initial: optional(string()),
  entry: optional(Actions),
  exit: optional(Actions),
  invoke: optional(Invoke),
  on: optional(TransitionsMap),
  after: optional(TransitionsMap),
  always: optional(SingleOrArray(Transition)),
  states: optional(lazy(() => States)),
  // TODO: supported on final states, implement it
  // data: ?
  history: optional(match([string(['shallow', 'deep']), bool(true)])),
  // XState seems to allow undefined here, that's weird? what would it mean?
  // it also only allows StateValue, need to recheck how the whole thing behaves
  // let's keep this defined as a simple string for now
  target: optional(string()),
});

const States = object({
  [indexer]: State,
});

const Options = optional(
  object({
    actions: optional(
      object({
        [indexer]: match([func(), Action()]),
      }),
    ),
    guards: optional(
      object({
        [indexer]: func(),
      }),
    ),
    services: optional(
      object({
        [indexer]: func(),
      }),
    ),
  }),
);

export const extractSchema = (type: Type) => {
  const [error, schema] = State.extract(type);
  if (error) {
    throw new Error('Could not extract state schema');
  }
  return schema;
};

export const extractOptions = (type: Type) => {
  const [error, options] = Options.extract(type);
  if (error) {
    throw new Error('Could not extract options');
  }
  return options;
};
