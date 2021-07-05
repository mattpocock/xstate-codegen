import { Machine, interpret } from '@xstate/compiled';

type Data = {
  yeah: boolean;
};

interface Context {
  data: Data;
}

type Event =
  | { type: 'MAKE_FETCH'; params: { id: string } }
  | { type: 'CANCEL' }
  | { type: 'done.invoke.makeFetch'; data: Data };

const machine = Machine<Context, Event, 'withConfigTest'>({
  initial: 'idle',
  states: {
    idle: {
      on: {
        MAKE_FETCH: 'pending',
      },
    },
    pending: {
      invoke: [
        {
          src: 'makeFetch',
          onDone: 'success',
        },
      ],
    },
    success: {
      entry: ['celebrate'],
    },
  },
});

/**
 * withConfig is a partial of the full options
 */
machine.withConfig(
  {
    actions: {
      // @ts-expect-error
      wrongActionName: () => {},
    },
    services: {
      // @ts-expect-error
      wrongServiceName: () => {},
    },
  },
  {
    data: {
      yeah: false
    }
  }
);
