## Usage

### CLI

`xstate-codegen "src/**/**.machine.ts"`

### Inside code

Instead of importing `createMachine` or `Machine` from `xstate`, import them from `@xstate/compiled`:

```ts
import { createMachine } from '@xtate/compiled';

const machine = createMachine();
```

You must pass three type options to `createMachine/Machine`:

1. The desired shape of your machine's context
2. The list of events your machine accepts, typed in a discriminated union (`type Event = { type: 'GO' } | { type: 'STOP' };`)
3. A string ID for your machine, unique to your project.

For instance:

```ts
import { Machine } from '@xtate/compiled';

interface Context {}

type Event = { type: 'DUMMY_TYPE' };

const machine = Machine<Context, Event, 'uniqueId'>({});
```

## Options

### Once

`xstate-codegen "src/**/**.machine.ts" --once`

By default, the CLI watches for changes in your files. Running `--once` runs the CLI only once.

### Out Dir

`xstate-codegen "src/**/**.machine.ts" --outDir="src"`

By default, the CLI adds the required declaration files inside node_modules at `node_modules/@xstate/compiled`. This writes the declaration files to a specified directory.

> Note, this only writes the declaration files to the directory. The `.js` files still get written to `node_modules/@xstate/compiled`.
