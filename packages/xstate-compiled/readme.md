## Type Safe State Machines

`xstate-codegen` gives you 100% type-safe usage of XState in Typescript. You get type safety on:

- Transition targets: `on: {EVENT: 'deep.nested.state'}`
- Services
- Guards
- Activities
- Actions
- The `initial` attribute
- `state.matches('deep.nested.state')`

This works by introspecting your machine in situ in your code. With this Thanos-level power, we can click our fingers and give you 100% type safety in your state machines.

## Usage

### CLI

`xstate-codegen "src/**/**.machine.ts"`

### Inside code

Instead of importing `createMachine` or `Machine` from `xstate`, import them from `@xstate/compiled`:

```ts
import { createMachine } from '@xstate/compiled';

const machine = createMachine();
```

You must pass three type options to `createMachine/Machine`:

1. The desired shape of your machine's context
2. The list of events your machine accepts, typed in a discriminated union (`type Event = { type: 'GO' } | { type: 'STOP' };`)
3. A string ID for your machine, unique to your project.

For instance:

```ts
import { Machine, UniqueIdInterpreter } from '@xstate/compiled';

interface Context {}

type Event = { type: 'DUMMY_TYPE' };

const machine = Machine<Context, Event, 'uniqueId'>({
    states: {
        first: {}
        second: {}
    }
});

type UniqueIdService = UniqueIdInterpreter<Context, Event>
```

### React support

For use with React you can import `useMachine` from `@xstate/compiled/react` instead for better type support.

Namely the `state.matches()` will type check against state schema properly.

```ts
import { useMachine } from '@xstate/compiled/react';

const [state, send, service] = useMachine(machine); // machine from previous example
state.matches('first'); // correctly type checked
state.matches('wrong'); // produces error
```

The `service` variable is useful to be passed to other components either through props or context.
Notice in the first example how we have declared `UniqueIdService`. You can use that type in such cases.

```ts
import { useService } from '@xstate/compiled/react';

function UniqueComponent({ service }: { service: UniqueIdService }) {
  const [state] = useService(service);
  state.matches('first'); // correctly type checked
  state.matches('wrong'); // produces error
}
```

## Options

### Once

`xstate-codegen "src/**/**.machine.ts" --once`

By default, the CLI watches for changes in your files. Running `--once` runs the CLI only once.

### Out Dir

`xstate-codegen "src/**/**.machine.ts" --outDir="src"`

By default, the CLI adds the required declaration files inside node_modules at `node_modules/@xstate/compiled`. This writes the declaration files to a specified directory.

> Note, this only writes the declaration files to the directory. The `.js` files still get written to `node_modules/@xstate/compiled`.
