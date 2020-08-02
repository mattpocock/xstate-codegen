import { Machine, interpret, LightMachineStateMachine } from 'xstate';
import { useMachine } from '@xstate/react';

interface LightStateSchema {
  states: {
    green: {};
    yellow: {};
    red: {
      states: {
        walk: {};
        wait: {};
        stop: {};
      };
    };
  };
}

type LightEvent =
  | { type: 'TIMER' }
  | { type: 'POWER_OUTAGE' }
  | { type: 'PED_COUNTDOWN'; duration: number };

interface LightContext {
  elapsed: number;
}

// Assign the generated type to your machine to get
// the stronger generated typings
const lightMachine: LightMachineStateMachine = Machine<
  LightContext,
  LightStateSchema,
  LightEvent
>({
  key: 'lightMachine',
  initial: 'green',
  context: { elapsed: 0 },
  states: {
    green: {
      on: {
        TIMER: 'yellow',
        POWER_OUTAGE: 'red',
      },
    },
    yellow: {
      on: {
        TIMER: 'red',
        POWER_OUTAGE: 'red',
      },
    },
    red: {
      on: {
        TIMER: 'green',
        POWER_OUTAGE: 'red',
      },
      initial: 'walk',
      states: {
        walk: {
          on: {
            PED_COUNTDOWN: 'wait',
          },
        },
        wait: {
          on: {
            PED_COUNTDOWN: {
              target: 'stop',
              cond: 'hasCompleted',
            },
          },
        },
        stop: {
          on: {
            // Transient transition
            '': { target: '#lightMachine.green' },
          },
        },
      },
    },
  },
});

const interpretTrafficLightMachine = () => {
  // We overload the exported 'interpret' from xstate
  // to allow for passing in the compiled machine.
  // Trouble is, this only type checks it fully if you
  // pass in all required fields, otherwise it falls back
  // to the non-compiled overloaded function.
  const interpreter = interpret(lightMachine, {
    compiled: true,
    guards: {
      hasCompleted: (context, event) => {
        return event.duration === 0 && context.elapsed > 0;
      },
    },
  });
  return interpreter;
};

const useTrafficLightMachine = () => {
  // We use useMachine, but this has the same pro's
  // and cons as the interpret implementation above
  const [state, send] = useMachine(lightMachine, {
    guards: {
      hasCompleted: (context, event) => {
        return event.duration === 0 && context.elapsed > 0;
      },
    },
  });
  return [state, send];
};
