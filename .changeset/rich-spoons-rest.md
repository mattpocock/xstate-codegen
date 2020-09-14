---
"xstate-codegen": minor
---

Added support for typestates in createMachine. You can now pass:

```ts
type State = { value: 'idle'; context: 'some-context' };

const machine = createMachine<Context, Event, State, 'machineId'>({});
```

This will be inferred inside options passed to the machine, and when you call `state.matches` after interpreting the machine.
