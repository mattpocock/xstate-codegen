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

const machine = createMachine<Context, Event, 'fetchMachineNullishCoalesce'>({
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

const input: { test: boolean | null } = {
  test: null,
};

interpret(
  machine.withConfig({
    services: {
      makeFetch: () => {
        return Promise.resolve({
          yeah: input?.test ?? true,
        });
      },
    },
    actions: {
      celebrate: (context, event) => {
        console.log(event.data);
      },
    },
  }),
);
