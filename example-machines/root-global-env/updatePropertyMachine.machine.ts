import {
  Machine,
  assign,
  UpdatePropertyStateMachine,
  interpretCompiled,
} from 'xstate';

interface Context {
  imageId?: string;
  isDeletingImage: boolean;
}

type StateSchema = {
  states: {
    idle: {};
    addingImage: {};
    updating: {};
    success: {};
    errored: {};
  };
};

export type UpdateMode = 'hasNewPhoto' | 'isDeletingPhoto' | 'samePhoto';

type Event = {
  type: 'UPDATE';
  mode: UpdateMode;
};

const updatePropertyMachine: UpdatePropertyStateMachine = Machine<
  Context,
  StateSchema,
  Event
>({
  initial: 'idle',
  id: 'updatePropertyMachine',
  context: {
    imageId: undefined,
    isDeletingImage: false,
  },
  states: {
    idle: {
      on: {
        UPDATE: [
          {
            cond: (context, event) => event.mode === 'hasNewPhoto',
            target: 'addingImage',
          },
          {
            cond: (context, event) => event.mode === 'isDeletingPhoto',
            actions: [
              assign((context) => ({
                isDeletingImage: true,
              })),
            ],
            target: 'updating',
          },
          {
            target: 'updating',
          },
        ],
      },
    },
    addingImage: {
      invoke: {
        src: 'addImage',
        onDone: {
          target: 'updating',
          actions: assign((context, event) => ({
            imageId: event.data,
          })),
        },
        onError: 'errored',
      },
    },
    updating: {
      invoke: {
        src: 'updateProperty',
        onDone: 'success',
        onError: 'errored',
      },
    },
    success: {
      entry: [
        'onSuccess',
        // Reset to initial values
        assign((context) => ({
          isDeletingImage: false,
          imageId: undefined,
        })),
      ],
      on: {
        '': 'idle',
      },
    },
    errored: {
      onEntry: ['onError'],
      on: {
        '': 'idle',
      },
    },
  },
});

interface Actions {
  addImage: () => Promise<string>;
  updateProperty: (context: Context) => Promise<void>;
  onSuccess: () => void;
  onError: () => void;
}

export const useUpdatePropertyLogic = (actions: Actions) => {
  const service = interpretCompiled(updatePropertyMachine, {
    actions: {
      awesome: {},
    },
    services: {
      something: {},
    },
  });
};
