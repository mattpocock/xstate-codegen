import { createMachine, interpret, assign } from '@xstate/compiled';

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

const machine = createMachine<Context, Event, 'withInlineCoreAction'>({
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
      entry: assign({
        data: (ctx, event) => event.data,
      }),
    },
  },
});

interpret(machine, {
  services: {
    makeFetch: () => {
      return Promise.resolve({
        yeah: true,
      });
    },
  },
});
