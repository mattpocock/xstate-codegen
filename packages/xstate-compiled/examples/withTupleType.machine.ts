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
  initial: 'idle' as const,
  states: {
    idle: {
      on: {
        MAKE_FETCH: 'pending',
      },
    } as const,
    pending: {
      invoke: {
        src: 'makeFetch' as const,
        onDone: 'success',
      },
    },
    success: {
      entry: ['celebrate'] as ['celebrate'],
    } as const,
  },
} as const;

const machine = createMachine<Context, Event, 'withTupleType'>(schema);

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
