import { Machine, interpret } from '@xstate/compiled';

interface Context {}

type Event = { type: 'MAKE_FETCH' };

/**
 * Ensures that optional parameters register as non-required
 * when passed in as a second param
 */
const machine = Machine<Context, Event, 'optionsMachine'>(
  {
    initial: 'idle',
    states: {
      idle: {
        entry: ['requiredAction', 'nonRequiredAction'],
        invoke: [
          {
            src: 'requiredService',
            onDone: [
              {
                cond: 'requiredCond',
              },
              {
                cond: 'nonRequiredCond',
              },
            ],
          },
          {
            src: 'nonRequiredService',
          },
        ],
      },
    },
  },
  {
    actions: {
      nonRequiredAction: () => {},
    },
    services: {
      nonRequiredService: async () => {},
    },
    guards: {
      nonRequiredCond: () => false,
    },
  },
);

interpret(machine, {
  actions: {
    requiredAction: () => {},
  },
  services: {
    requiredService: async () => {},
  },
  guards: {
    requiredCond: () => true,
  },
});
