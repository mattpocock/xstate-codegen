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

const machine = Machine<Context, Event, 'fetchMachineOptionalServices'>(
  {
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
  },
  {
    services: {
      makeFetch: () => {
        return Promise.resolve({
          yeah: true,
        });
      },
    },
  },
);

interpret(machine, {
  actions: {
    celebrate: (context, event) => {
      console.log(event.data);
    },
  },
});
