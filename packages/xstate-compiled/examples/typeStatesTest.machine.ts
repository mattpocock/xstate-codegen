import { createMachine, interpret } from '@xstate/compiled';
import { useMachine } from '@xstate/compiled/react';

type Context = 'red-context' | 'green-context';

type Event = { type: 'DUMMY_TYPE' };

type State =
  | { value: 'green'; context: 'green-context' }
  | {
      value: 'red';
      context: 'red-context';
    };

const machine = createMachine<Context, Event, State, 'typeStatesTest'>({
  initial: 'green',
  states: {
    red: {
      entry: ['redAction'],
      invoke: {
        src: 'redService',
        onDone: {
          cond: 'redCond',
        },
      },
    },
    green: {
      entry: ['greenAction'],
      invoke: {
        src: 'greenService',
        onDone: {
          cond: 'greenCond',
        },
      },
    },
  },
});

const service = interpret(machine, {
  actions: {
    greenAction: (context) => {
      // @ts-expect-error
      context === 'red-context';
      context === 'green-context';
    },
    redAction: (context) => {
      // @ts-expect-error
      context === 'green-context';
      context === 'red-context';
    },
  },
  guards: {
    greenCond: (context) => {
      // @ts-expect-error
      context === 'red-context';
      return context === 'green-context';
    },
    redCond: (context) => {
      // @ts-expect-error
      context === 'green-context';
      return context === 'red-context';
    },
  },
  services: {
    greenService: async (context) => {
      // @ts-expect-error
      context === 'red-context';
      context === 'green-context';
    },
    redService: async (context) => {
      // @ts-expect-error
      context === 'green-context';
      context === 'red-context';
    },
  },
}).start();

if (service.state.matches('green')) {
  // @ts-expect-error
  service.state.context === 'red-context';
}

const useThisMachine = () => {
  const [state, dispatch] = useMachine(machine, {
    actions: {
      greenAction: (context) => {
        // @ts-expect-error
        context === 'red-context';
        context === 'green-context';
      },
      redAction: (context) => {
        // @ts-expect-error
        context === 'green-context';
        context === 'red-context';
      },
    },
    guards: {
      greenCond: (context) => {
        // @ts-expect-error
        context === 'red-context';
        return context === 'green-context';
      },
      redCond: (context) => {
        // @ts-expect-error
        context === 'green-context';
        return context === 'red-context';
      },
    },
    services: {
      greenService: async (context) => {
        // @ts-expect-error
        context === 'red-context';
        context === 'green-context';
      },
      redService: async (context) => {
        // @ts-expect-error
        context === 'green-context';
        context === 'red-context';
      },
    },
  });

  if (state.matches('green')) {
    // @ts-expect-error
    state.context === 'red-context';
    state.value === 'green';
  }
};
