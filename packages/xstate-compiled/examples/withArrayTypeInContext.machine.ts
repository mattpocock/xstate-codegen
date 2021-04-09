import { createMachine } from '@xstate/compiled';

interface Context {
  attendeesToCreate: string[];
}

type Event = { type: 'ADD_ATTENDEE'; name: string; email: string };

const initialContext: Context = {
  attendeesToCreate: [],
};

export const addViewingAttendeesMachine = createMachine<
  Context,
  Event,
  'withArrayTypeInContext'
>({
  context: initialContext,
  initial: 'idle',
  states: {
    idle: {},
  },
});
