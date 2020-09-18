import { Machine, interpret } from '@xstate/compiled';

interface Context {}

type Event = { type: 'MAKE_FETCH' };

/**
 * Ensures that optional parameters register as non-required
 * when passed in as a second param
 */
const machine = Machine<Context, Event, 'nonRequiredOptionsMachine'>(
  {
    initial: 'idle',
    states: {
      idle: {
        entry: ['nonRequiredAction'],
        invoke: [
          {
            src: 'nonRequiredService',
            onDone: [
              {
                cond: 'nonRequiredCond',
              },
            ],
          },
        ],
        activities: ['nonRequiredActivity'],
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
    activities: {
      nonRequiredActivity: () => {},
    },
    guards: {
      nonRequiredCond: () => false,
    },
  },
);

interpret(machine, {});
