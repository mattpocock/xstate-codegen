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

let target = '';

const machine = Machine<Context, Event, 'withConstAssertion'>({
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
        onDone: target as 'success',
      },
    },
    success: {
      entry: 'celebrate',
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
  actions: {
    celebrate: (context, event) => {
      console.log(event.data);
    },
  },
});
