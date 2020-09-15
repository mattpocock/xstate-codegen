import { Type, ts, Node } from 'ts-morph';

const indexer = Symbol('schema.extractor.indexer');

// TODO: implement support for inline functions - we just need to skip them
// but probably would be good to declare that in a schema somehow?

type TypeExtractor = {
  extract: (
    node: Node | undefined,
  ) => [true, undefined] | [false, any, boolean?];
};

const lazy = (getter: () => TypeExtractor): TypeExtractor => ({
  extract: (node: Node | undefined) => getter().extract(node),
});
const object = (
  shape: Record<string | symbol, TypeExtractor>,
): TypeExtractor => ({
  extract(node: Node | undefined) {
    if (!node) {
      return [true, undefined];
    }

    const type = node.getType();

    if (!type.isObject()) {
      return [true, undefined];
    }

    const objectType = type as Type<ts.ObjectType>;

    if (objectType.getStringIndexType() || objectType.getNumberIndexType()) {
      // we don't allow indexer types, we need to resolve to literal keys
      return [true, undefined];
    }

    const extracted: any = {};

    for (const key of Object.keys(shape)) {
      const valueDeclar = objectType
        .getProperty(key)
        ?.getValueDeclarationOrThrow() as any; /* PropertyAssignment */
      const propNode = valueDeclar?.getInitializerOrThrow();

      const [err, value, hasValue] = shape[key].extract(propNode);
      if (err) {
        return [err, undefined];
      }
      if (hasValue) {
        extracted[key] = value;
      }
    }

    if (shape[indexer as any]) {
      const indexerExtractor: TypeExtractor = shape[indexer as any];
      for (const prop of objectType.getProperties()) {
        const name = prop.getName();
        if (name in shape) {
          continue;
        }
        const valueDeclar = prop?.getValueDeclarationOrThrow() as any; /* PropertyAssignment */
        const propNode = valueDeclar?.getInitializerOrThrow();

        const [err, value, hasValue] = indexerExtractor.extract(propNode);
        if (err) {
          return [err, undefined];
        }
        if (hasValue) {
          extracted[name] = value;
        }
      }
    }

    return [false, extracted, true];
  },
});
const optional = (t: TypeExtractor): TypeExtractor => ({
  extract(node: Node | undefined) {
    if (!node) {
      return [false, undefined, false];
    }
    return t.extract(node);
  },
});
const array = (typeExtractor: TypeExtractor): TypeExtractor => ({
  extract(node: Node | undefined) {
    if (!node) {
      return [true, undefined];
    }

    // TODO: handle tuple types
    if (!Node.isArrayLiteralExpression(node)) {
      return [true, undefined];
    }

    const result = [];

    for (const element of node.getElements()) {
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
  extract(node: Node | undefined) {
    for (const candidate of candidates) {
      const [, value, hasValue] = candidate.extract(node);
      if (hasValue) {
        return [false, value, true];
      }
    }

    return [true, undefined];
  },
});
const undef = (): TypeExtractor => ({
  extract(node: Node | undefined) {
    if (!node) {
      return [true, undefined];
    }
    const type = node.getType();
    if (!type.isUndefined()) {
      return [true, undefined];
    }
    return [false, undefined, true];
  },
});
const bool = (literal?: boolean): TypeExtractor => ({
  extract(node: Node | undefined) {
    if (!node) {
      return [true, undefined];
    }
    const type = node.getType();
    if (!type.isBooleanLiteral()) {
      return [true, undefined];
    }
    return [false, (type.compilerType as any).intrinsicName === 'true', true];
  },
});
const string = (literals?: string[]): TypeExtractor => ({
  extract(node: Node | undefined) {
    if (!node) {
      return [true, undefined];
    }
    const type = node.getType();
    if (!type.isStringLiteral()) {
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
  extract(node: Node | undefined) {
    if (!node) {
      return [true, undefined];
    }
    if (!Node.isFunctionLikeDeclaration(node)) {
      return [true, undefined];
    }
    return [false, () => {}, true];
  },
});

const SingleOrArray = (typeExtractor: TypeExtractor): TypeExtractor =>
  match([typeExtractor, array(typeExtractor)]);

const Actions = SingleOrArray(string());

const Target = match([undef(), SingleOrArray(string())]);

const Transition = match([
  Target,
  object({
    target: optional(Target),
    cond: optional(string()),
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

const AtomicState = object({
  type: optional(string(['atomic'])),
  id: optional(string()),
  entry: optional(Actions),
  exit: optional(Actions),
  invoke: optional(Invoke),
  on: optional(TransitionsMap),
  after: optional(TransitionsMap),
});
const CompoundState = object({
  type: optional(string(['compound'])),
  id: optional(string()),
  initial: string(),
  entry: optional(Actions),
  exit: optional(Actions),
  invoke: optional(Invoke),
  states: lazy(() => States),
  on: optional(TransitionsMap),
  after: optional(TransitionsMap),
});
const ParallelState = object({
  type: string(['parallel']),
  id: optional(string()),
  entry: optional(Actions),
  exit: optional(Actions),
  invoke: optional(Invoke),
  states: lazy(() => States),
  on: optional(TransitionsMap),
  after: optional(TransitionsMap),
});
const FinalState = object({
  type: string(['final']),
  id: optional(string()),
  entry: optional(Actions),
  exit: optional(Actions),
  // TODO: implement it
  // data: ?
});
const HistoryState = object({
  type: string(['history']),
  history: match([string(['shallow', 'deep']), bool(true)]),
  // XState seems to allow undefined here, that's weird? what would it mean?
  // it also only allows StateValue, need to recheck how the whole thing behaves
  // let's keep this defined as a simple string for now
  target: string(),
});

// order matters here - compound and atomic have to come last, in that order
const State = match([
  FinalState,
  ParallelState,
  HistoryState,
  CompoundState,
  AtomicState,
]);

const States = object({
  [indexer]: State,
});

const extractConfig = (node: Node) => State.extract(node);

export default extractConfig;

const Options = optional(
  object({
    actions: optional(
      object({
        [indexer]: func(),
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

export const extractOptions = (node: Node) => Options.extract(node);
