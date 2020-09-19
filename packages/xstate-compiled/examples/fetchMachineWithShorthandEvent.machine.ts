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
  | { type: 'makeFetch.onDone'; data: Data }
  | { type: 'makeFetch.onError'; data: 'bad-error' };

const machine = Machine<Context, Event, 'fetchMachineWithShorthandEvent'>({
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
          onError: 'errored',
        },
      ],
    },
    success: {
      entry: ['celebrate'],
    },
    errored: {
      entry: ['booLoudly'],
    },
  },
});

interpret(machine, {
  services: {
    /** Expect an error because we're passing back incorrect data */
    // @ts-expect-error
    makeFetch: () => {
      return Promise.resolve({
        badData: true,
      });
    },
  },
  actions: {
    celebrate: (context, event) => {
      console.log(event.data);
    },
    booLoudly: (context, event) => {
      event.data === 'bad-error';
    },
  },
});
