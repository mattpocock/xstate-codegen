import { Machine, actions } from '@xstate/compiled';

interface Context {}

type Event = { type: 'SOME_EVENT' } | { type: 'ANOTHER_EVENT' };

/**
 * An example machine using the `choose` action
 */
const machine = Machine<Context, Event, 'chooseMachine'>({
  initial: 'idle',
  states: {
    idle: {
      on: {
        SOME_EVENT: {
          actions: actions.choose([
            { cond: 'guardA', actions: ['actionA', 'actionB'] },
            { cond: 'guardB', actions: ['actionB'] },
            { actions: 'actionC' }
          ])
        },
        ANOTHER_EVENT: {
          cond: 'guardC',
          actions: 'actionD',
        }
      },
    },
  },
}, {
  guards: {
    guardA: (context, event) => false,
    guardB: (context, event) => true,
    guardC: (context, event) => true,
  },
  actions: {
    actionA: (context, event) => {},
    actionB: (context, event) => {},
    actionC: (context, event) => {},
    actionD: (context, event) => {},
  },
});