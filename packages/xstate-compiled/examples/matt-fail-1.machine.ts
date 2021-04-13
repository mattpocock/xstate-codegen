import { Machine, send, assign } from '@xstate/compiled';

export type AddUserParams = {
  name: string;
  email: string;
  username: string;
  role: 'admin' | 'agent';
  profilePhoto?: string;
  phoneNumber?: string;
  whatsappNumber?: string;
  biography?: string;
};

interface Context {
  createParams?: AddUserParams;
  updateParams?: AddUserParams;
  usernameCheckCache: Record<string, boolean>;
  username?: string;
}

export type Event =
  | { type: 'SUBMIT_CREATE'; params: AddUserParams }
  | { type: 'SUBMIT_UPDATE'; params: AddUserParams }
  | { type: 'CANCEL' }
  | {
      type: 'REPORT_ERROR';
    }
  | { type: 'REPORT_USERNAME_CHANGED'; username: string }
  | { type: 'REPORT_RESET_PASSWORD' }
  | {
      type: 'done.invoke.checkIfUsernameIsUnique';
      data: {
        isUnique: boolean;
      };
    };

export const addUserMachine = Machine<Context, Event, 'mattFailOne'>(
  {
    id: 'addUserMachine',
    context: {
      usernameCheckCache: {},
    },
    on: {
      REPORT_USERNAME_CHANGED: {
        cond: 'usernameIsNotEmpty',
        target: 'checkingIfIsInEditMode',
        actions: [
          assign((context, event) => {
            return {
              username: event.username,
            };
          }),
        ],
      },
      REPORT_RESET_PASSWORD: {
        target: 'resettingPassword',
      },
    },
    initial: 'idle',
    states: {
      idle: {
        on: {
          CANCEL: { actions: 'goBackToUsersPage' },
          SUBMIT_CREATE: {
            target: 'creating',
            cond: 'isUsernameValid',
            actions: assign((context, event) => ({
              createParams: event.params,
            })),
          },
          SUBMIT_UPDATE: {
            target: 'updating',
            actions: assign((context, event) => ({
              updateParams: event.params,
            })),
          },
        },
      },
      checkingIfIsInEditMode: {
        always: [
          {
            target: 'idle',
            cond: 'isInEditMode',
          },
          { target: 'checkingUsernameUniqueness' },
        ],
      },
      checkingUsernameUniqueness: {
        initial: 'checkingIfWeHaveItInCache',
        states: {
          checkingIfWeHaveItInCache: {
            always: [
              {
                cond: 'isInCache',
                target: 'complete',
              },
              {
                target: 'throttlingBeforeCheck',
              },
            ],
          },
          throttlingBeforeCheck: {
            after: {
              800: 'checkingWithApi',
            },
          },
          checkingWithApi: {
            invoke: {
              src: 'checkIfUsernameIsUnique',
              onDone: {
                target: 'complete',
                actions: 'assignUsernameResultToCache',
              },
              onError: {
                target: 'complete',
              },
            },
          },
          complete: {
            type: 'final',
          },
        },
        onDone: 'idle',
      },
      resettingPassword: {
        invoke: {
          src: 'resetUserPassword',
          onDone: {
            target: 'idle',
            actions: 'showSuccessfullyResetPasswordToast',
          },
          onError: {
            actions: 'showResetPasswordErroredToast',
            target: 'idle',
          },
        },
      },
      updating: {
        initial: 'checking',
        onDone: { target: 'complete', actions: 'reportUpdateSuccessViaToast' },
        on: {
          REPORT_ERROR: 'idle',
        },
        states: {
          checking: {
            always: [
              {
                cond: 'hasChangedWhetherUserIsAdmin',
                target: 'updatingUserAccount',
              },
              {
                target: 'updatingUserEntity',
              },
            ],
          },
          updatingUserAccount: {
            invoke: {
              src: 'updateUserAccount',
              onDone: {
                target: 'updatingUserEntity',
              },
              onError: {
                actions: [send('REPORT_ERROR'), 'reportErrorViaToast'],
              },
            },
          },
          updatingUserEntity: {
            invoke: {
              src: 'updateUser',
              onDone: { target: 'complete' },
              onError: {
                actions: [send('REPORT_ERROR'), 'reportErrorViaToast'],
              },
            },
          },
          complete: {
            type: 'final',
          },
        },
      },
      creating: {
        initial: 'creatingUserInCognito',
        on: {
          REPORT_ERROR: 'idle',
        },
        onDone: 'complete',
        states: {
          creatingUserInCognito: {
            invoke: {
              src: 'createUserInCognito',
              onError: 'errored',
              onDone: 'complete',
            },
          },
          complete: {
            type: 'final',
            entry: 'reportCreateSuccessViaToast',
          },
          errored: {
            onEntry: [send('REPORT_ERROR'), 'reportErrorViaToast'],
          },
        },
      },
      complete: {
        entry: ['goBackToUsersPage'],
        type: 'final',
      },
    },
  },
  {
    actions: {
      assignUsernameResultToCache: assign((context, event) => {
        if (!context.username) return {};
        return {
          usernameCheckCache: {
            ...context.usernameCheckCache,
            [context.username]: event.data.isUnique,
          },
        };
      }),
    },
    guards: {
      isInCache: (context) => {
        if (!context.username) {
          return false;
        }
        return (
          typeof context.usernameCheckCache[context.username] === 'boolean'
        );
      },
      usernameIsNotEmpty: (context, event) => {
        return Boolean(event.username);
      },
      isUsernameValid: (context) => {
        if (!context.username) {
          return false;
        }
        return context.usernameCheckCache[context.username] === true;
      },
    },
  },
);
