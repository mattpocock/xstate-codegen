import { Machine, interpret } from '@xstate/compiled';

const machine = Machine<
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

const service = interpret(machine, {});
