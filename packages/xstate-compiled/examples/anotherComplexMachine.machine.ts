import { Machine, send, assign } from '@xstate/compiled';

type Attendee = {
  name: string;
  email: string;
  id: string;
};

interface Context {
  initialAttendees: Attendee[];
  attendeesToCreate: Attendee[];
  attendeesInList: Attendee[];
  attendeeIdsToDelete: Set<string>;
}

type Event =
  | { type: 'ADD_ATTENDEE'; name: string; email: string }
  | { type: 'EDIT_ATTENDEE'; id: string; name: string; email: string }
  | { type: 'REMOVE_ATTENDEE'; id: string }
  | {
      type: 'GO_BACK';
    }
  | {
      type: 'SUBMIT';
    }
  | {
      type: 'REPORT_ERROR';
    }
  | {
      type: 'done.invoke.createViewing';
      data: string;
    };

const assignAttendee = assign<
  Context,
  Extract<Event, { type: 'ADD_ATTENDEE' }>
>((context, event) => {
  const newAttendee = {
    id: '1',
    email: event.email,
    name: event.name,
  };
  return {
    attendeesToCreate: [...context.attendeesToCreate, newAttendee],
    attendeesInList: [...context.attendeesInList, newAttendee],
  };
});

export const addViewingAttendeesMachine = Machine<
  Context,
  Event,
  'addViewingAttendees'
>({
  id: 'addViewingAttendees',
  context: {
    attendeesToCreate: [],
    attendeeIdsToDelete: new Set(),
    initialAttendees: [],
    attendeesInList: [],
  },
  initial: 'idle',
  states: {
    idle: {
      on: {
        GO_BACK: [
          {
            cond: 'inCreateMode',
            actions: 'goToPrevPage',
          },
          {
            cond: 'inEditMode',
            actions: 'goBackToEditOverview',
          },
        ],
        ADD_ATTENDEE: [
          {
            actions: [assignAttendee],
          },
        ],
        REMOVE_ATTENDEE: {
          actions: [
            assign((context, event) => {
              let attendeeIdsToDelete = new Set(context.attendeeIdsToDelete);
              attendeeIdsToDelete.add(event.id);

              return {
                attendeeIdsToDelete,
                attendeesInList: context.attendeesInList.filter(
                  (attendee) => attendee.id !== event.id,
                ),
                attendeesToCreate: context.attendeesToCreate.filter(
                  (attendee) => attendee.id !== event.id,
                ),
              };
            }),
          ],
        },
        EDIT_ATTENDEE: [
          {
            actions: [
              assign((context, event) => {
                const attendeeWasOnInitialList = context.initialAttendees.some(
                  (attendee) => {
                    return attendee.id === event.id;
                  },
                );

                let attendeeIdsToDelete = new Set(context.attendeeIdsToDelete);
                if (attendeeWasOnInitialList) {
                  attendeeIdsToDelete.add(event.id);
                }

                return {
                  attendeeIdsToDelete,
                  attendeesToCreate: [
                    ...context.attendeesToCreate.filter(
                      (attendee) => attendee.id !== event.id,
                    ),
                    { email: event.email, id: event.id, name: event.name },
                  ],
                  attendeesInList: context.attendeesInList.map((attendee) => {
                    if (attendee.id === event.id) {
                      return {
                        id: event.id,
                        name: event.name,
                        email: event.email,
                      };
                    }
                    return attendee;
                  }),
                };
              }),
            ],
          },
        ],
      },
      initial: 'initial',
      states: {
        initial: {
          on: {
            SUBMIT: [
              {
                cond: 'hasNotAddedAnyInvitees',
                target: 'isWarningThatUserIsNotInvitingAnyone',
              },
              {
                cond: 'currentFormStateIsValidAndInCreateMode',
                target: '#creating',
              },
              {
                cond: 'currentFormStateIsValidAndInUpdateMode',
                target: '#updating',
              },
            ],
          },
        },
        isWarningThatUserIsNotInvitingAnyone: {
          on: {
            ADD_ATTENDEE: {
              actions: [assignAttendee],
              target: 'initial',
            },
            SUBMIT: [
              {
                cond: 'currentFormStateIsValidAndInCreateMode',
                target: '#creating',
              },
              {
                cond: 'currentFormStateIsValidAndInUpdateMode',
                target: '#updating',
              },
            ],
          },
        },
        errored: {},
      },
    },
    creating: {
      id: 'creating',
      invoke: {
        src: 'createViewing',
        onDone: {
          target: 'idle',
          actions: 'goToSuccessPage',
        },
        onError: {
          target: 'idle.errored',
        },
      },
    },
    updating: {
      id: 'updating',
      initial: 'checkingAttendees',
      states: {
        checkingAttendees: {
          always: [
            {
              cond: (context) =>
                Array.from(context.attendeeIdsToDelete).length > 0,
              target: 'deletingExcessGuests',
            },
            {
              cond: (context) => context.attendeesToCreate.length > 0,
              target: 'creatingNewAndEditedGuests',
            },
            {
              target: 'complete',
            },
          ],
        },
        deletingExcessGuests: {
          invoke: {
            src: 'deleteExcessGuests',
            onDone: [
              {
                cond: (context) => context.attendeesToCreate.length > 0,
                target: 'creatingNewAndEditedGuests',
              },
              {
                target: 'complete',
              },
            ],
            onError: 'errored',
          },
        },
        creatingNewAndEditedGuests: {
          invoke: {
            src: 'createNewGuests',
            onDone: [
              {
                target: 'complete',
              },
            ],
            onError: 'errored',
          },
        },
        errored: {
          entry: send({
            type: 'REPORT_ERROR',
          }),
        },
        complete: {
          type: 'final',
          entry: ['goBackToEditOverview', 'showToastWithChangesSaved'],
        },
      },
    },
  },
});
