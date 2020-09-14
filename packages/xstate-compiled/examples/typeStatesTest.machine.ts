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
    },
    green: {
      entry: ['greenAction'],
    },
  },
});

interpret(machine, {
  actions: {
    greenAction: (context) => {
      // @ts-expect-error
      context === 'red-context';
    },
    redAction: (context) => {
      // @ts-expect-error
      context === 'green-context';
    },
  },
});

const useThisMachine = () => {
  const [state, dispatch] = useMachine(machine, {
    actions: {
      greenAction: (context) => {
        // @ts-expect-error
        context === 'red-context';
      },
      redAction: (context) => {
        // @ts-expect-error
        context === 'green-context';
      },
    },
  });
};
