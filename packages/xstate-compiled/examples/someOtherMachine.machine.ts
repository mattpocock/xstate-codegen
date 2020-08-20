import { Machine, interpret } from '@xstate/compiled';
import { useMachine } from '@xstate/compiled/react';

type FaceEvent =
  | { type: 'OPEN_MOUTH'; wordToSay: string }
  | { type: 'CLOSE_MOUTH' }
  | {
      type: 'OPEN_EYES';
    }
  | {
      type: 'CLOSE_EYES';
    }
  | {
      type: 'FALL_ASLEEP';
    };

interface FaceContext {
  elapsed: number;
}

const faceMachine = Machine<FaceContext, FaceEvent, 'faceMachine'>({
  type: 'parallel',
  initial: undefined,
  states: {
    eyes: {
      initial: 'open',
      states: {
        open: {
          on: {
            CLOSE_EYES: 'closed',
          },
        },
        middle: {
          initial: 'closing',
          after: {
            8000: [
              {
                cond: 'checkingIfCanGoCool',
                target: 'open',
              },
            ],
          },
          states: {
            closing: {},
            somethingCool: {
              always: 'closing',
            },
          },
        },
        closed: {
          on: {
            OPEN_EYES: 'open',
          },
          initial: 'awakeButPretending',
          states: {
            dreaming: {},
            awakeButPretending: {
              on: {
                FALL_ASLEEP: 'dreaming',
              },
            },
          },
        },
      },
    },
    mouth: {
      initial: 'open',
      states: {
        open: {
          on: {
            OPEN_MOUTH: 'closed',
          },
        },
        closed: {
          id: 'mouthClosed',
          on: {
            OPEN_MOUTH: 'open',
          },
        },
      },
    },
  },
});

const useTrafficLightMachine = () => {
  // We use useCompiledMachine instead of
  // useMachine to avoid function overload problems
  const [state, send] = useMachine(faceMachine, {
    guards: {
      checkingIfCanGoCool: () => {
        return false;
      },
    },
  });

  return [state, send];
};
