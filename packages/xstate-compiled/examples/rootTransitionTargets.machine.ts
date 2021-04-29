import { createMachine, interpret } from '@xstate/compiled';

const machine = createMachine<
  {},
  { type: 'EVENT' } | { type: 'EVENT2' },
  'rootTransitionTargets'
>({
  initial: 'red',
  on: {
    EVENT: 'green',
    EVENT2: '.green',
  },
  states: {
    red: {},
    green: {},
  },
});

const service = interpret(machine);
