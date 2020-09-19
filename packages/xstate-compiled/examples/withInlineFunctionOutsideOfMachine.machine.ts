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

const notify = (
  ctx: Context,
  event: { type: 'MAKE_FETCH'; params: { id: string } },
) => {};

const machine = Machine<Context, Event, 'withInlineFunctionOutsideOfMachine'>({
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
      entry: notify,
    },
    success: {},
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
