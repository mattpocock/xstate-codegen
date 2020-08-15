import { Machine, interpret } from '@xstate/compiled';
import { assign } from 'xstate';

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

const machine = Machine<Context, Event, 'fetchMachine'>({
  initial: 'idle',
  on: {
    CANCEL: '.idle',
  },
  states: {
    idle: {
      on: {
        MAKE_FETCH: 'pending',
      },
    },
    pending: {
      invoke: {
        src: 'makeFetch',
        onDone: {
          target: 'success',
        },
        onError: {
          target: 'errored',
          actions: 'reportError',
        },
      },
    },
    success: {
      entry: 'assignFetchToState',
    },
    errored: {},
  },
});

interpret(machine, {
  services: {
    makeFetch: (context, event) => {
      return Promise.resolve({
        yeah: true,
      });
    },
  },
  actions: {
    assignFetchToState: assign((context, event) => ({
      data: event.data,
    })),
    reportError: (context, event) => {},
  },
});
