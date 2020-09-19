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

const machine = Machine<Context, Event, 'withStronglyTypedInlineService'>({
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
          onDone: {
            target: 'success',
            actions: [
              (context, event) => {
                // @ts-expect-error
                typeof event.data.yeah === 'string';
              },
            ],
          },
        },
      ],
      entry: (ctx, event) => {
        console.log(event.params.id);
      },
    },
    success: {},
  },
});

interpret(machine, {
  services: {
    // @ts-expect-error
    makeFetch: () => {
      return Promise.resolve({
        something: 'awesome',
      });
    },
  },
});
