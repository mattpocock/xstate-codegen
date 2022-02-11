import { createMachine, interpret } from '@xstate/compiled';

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

const schema = {
  initial: 'idle',
  states: {
    idle: {
      on: {
        MAKE_FETCH: 'pending',
      },
    },
    pending: {
      invoke: {
        src: 'makeFetch',
        onDone: 'success',
      },
    },
    success: {
      entry: 'celebrate',
    },
  },
} as const;

const machine = createMachine<Context, Event, 'withIdentifierAsSchema'>(schema);

machine.withConfig({
  services: {
    makeFetch: () => {
      return Promise.resolve({
        yeah: true,
      });
    },
  },
  actions: {
    celebrate: (context, event) => {
      console.log(event.data);
    },
  },
});
