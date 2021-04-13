import { Machine, send, assign } from '@xstate/compiled';

export type Attendee = {
  id: string;
  name: string;
  email: string;
  timezone: string;
  locale: string;
};

interface Context {
  initialAttendees: Attendee[];
  attendeesToCreate: Attendee[];
  attendeesInList: Attendee[];
  attendeeIdsToDelete: Set<string>;
  errorMessage?: string;
}

type Event =
  | {
      type: 'EDIT_ATTENDEE';
      attendee: Attendee;
    }
  | {
      type: 'REMOVE_ATTENDEE';
      attendee: Attendee;
    }
  | {
      type: 'EDIT_EMPTY_ATTENDEE';
      attendeeWithoutId: Omit<Attendee, 'id'>;
    }
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

export const addViewingAttendeesMachine = Machine<
  Context,
  Event,
  'mattFailTwo'
>(
  {
    id: 'addViewingAttendees',
    initial: 'idle',
    entry: [],
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
          EDIT_ATTENDEE: [
            {
              cond: 'isEditingToBeEmpty',
              actions: 'removeAttendee',
            },
            {
              actions: ['editAttendee'],
            },
          ],
          REMOVE_ATTENDEE: {
            actions: 'removeAttendee',
          },
          EDIT_EMPTY_ATTENDEE: {
            actions: 'addAttendee',
          },
        },
        exit: ['clearError'],
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
                  cond: 'hasInvitedAnInviteeWithoutAName',
                  actions: 'showNameError',
                },
                {
                  cond: 'hasInvitedAnInviteeWithoutAnEmail',
                  actions: 'showEmailError',
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
        on: {
          REPORT_ERROR: {
            target: 'idle',
          },
        },
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
            entry: [
              send({
                type: 'REPORT_ERROR',
              }),
            ],
          },
          complete: {
            type: 'final',
            entry: ['goBackToEditOverview', 'showToastWithChangesSaved'],
          },
        },
      },
    },
  },
  {
    guards: {
      isEditingToBeEmpty: (context, event) => {
        return (
          event.attendee.email.length === 0 && event.attendee.name.length === 0
        );
      },
      hasInvitedAnInviteeWithoutAName: (context) => {
        return context.attendeesInList.some((attendee) => !attendee.name);
      },
      hasInvitedAnInviteeWithoutAnEmail: (context) => {
        return context.attendeesInList.some((attendee) => !attendee.email);
      },
    },
    actions: {
      clearError: assign((context, event) => {
        return {
          errorMessage: '',
        };
      }),
      showNameError: assign((context, event) => ({
        errorMessage: intl.formatMessage({
          defaultMessage: `You must provide a name for each guest`,
          description: `An error that shows when the user has not provided enough invitee information`,
        }) as string,
      })),
      showEmailError: assign((context, event) => ({
        errorMessage: intl.formatMessage({
          defaultMessage: `You must provide an email address for each guest`,
          description: `An error that shows when the user has not provided enough invitee information`,
        }) as string,
      })),
      removeAttendee: assign((context, event) => {
        let attendeeIdsToDelete = new Set(context.attendeeIdsToDelete);
        attendeeIdsToDelete.add(event.attendee.id);

        return {
          attendeeIdsToDelete,
          attendeesInList: context.attendeesInList.filter(
            (attendee) => attendee.id !== event.attendee.id,
          ),
          attendeesToCreate: context.attendeesToCreate.filter(
            (attendee) => attendee.id !== event.attendee.id,
          ),
        };
      }),
      addAttendee: assign((context, event) => {
        const newAttendee: Attendee = {
          ...event.attendeeWithoutId,
          id: 1,
        };
        return {
          attendeesToCreate: [...context.attendeesToCreate, newAttendee],
          attendeesInList: [...context.attendeesInList, newAttendee],
        };
      }),
      editAttendee: assign((context, event) => {
        const attendeeWasOnInitialList = context.initialAttendees.some(
          (attendee) => {
            return attendee.id === event.attendee.id;
          },
        );

        let attendeeIdsToDelete = new Set(context.attendeeIdsToDelete);
        if (attendeeWasOnInitialList) {
          attendeeIdsToDelete.add(event.attendee.id);
        }

        return {
          attendeeIdsToDelete,
          attendeesToCreate: [
            ...context.attendeesToCreate.filter(
              (attendee) => attendee.id !== event.attendee.id,
            ),
            event.attendee,
          ],
          attendeesInList: context.attendeesInList.map((attendee) => {
            if (attendee.id === event.attendee.id) {
              return event.attendee;
            }
            return attendee;
          }),
        };
      }),
    },
  },
);
