## Type Safe State Machines

`xstate-codegen` gives you 100% type-safe usage of XState in Typescript. [Try it out at this codesandbox!](https://codesandbox.io/s/xstate-codegen-example-7etw2?file=/src/demo.machine.ts)

You get type safety on:

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
import { Machine } from '@xstate/compiled';

interface Context {}

type Event = { type: 'DUMMY_TYPE' };

const machine = Machine<Context, Event, 'uniqueId'>({});
```

### Usage with React

```ts
import { useMachine } from '@xstate/compiled/react';
import { machine } from './myMachine.machine';

const [state, dispatch] = useMachine(machine, {
  // all options in here will be type checked
});
```

### Usage with Interpret

```ts
import { interpret } from '@xstate/compiled';
import { machine } from './myMachine.machine';

const service = interpret(machine).withConfig({
  // all options in here will be type checked
});
```

## Options

### Once

`xstate-codegen "src/**/**.machine.ts" --once`

By default, the CLI watches for changes in your files. Running `--once` runs the CLI only once.

### Out Dir

`xstate-codegen "src/**/**.machine.ts" --outDir="src"`

By default, the CLI adds the required declaration files inside node_modules at `node_modules/@xstate/compiled`. This writes the declaration files to a specified directory.

> Note, this only writes the declaration files to the directory. The `.js` files still get written to `node_modules/@xstate/compiled`.

### cwd

`xstate-codegen "src/**/**.machine.ts" --cwd ../`

Change the working directory that xstate-codegen operates in. This can sometimes be useful for altering which node_modules folder you'd like to target.
