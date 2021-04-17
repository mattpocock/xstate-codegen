import { createMachine } from '@xstate/compiled';
import { useMachine } from '@xstate/compiled/react';

interface Context {}

type Event = { type: 'CLICK' };

const machine = createMachine<Context, Event, 'mattFailThree'>({
  initial: 'notClicked',
  id: 'hasBeenClickedMachine',
  states: {
    notClicked: {
      on: {
        CLICK: 'hasBeenClicked',
      },
    },
    hasBeenClicked: {
      after: {
        5000: 'notClicked',
      },
    },
  },
});

export const useHasBeenClicked = () =>
  useMachine(machine, { devTools: process.env.NODE_ENV === 'development' });
