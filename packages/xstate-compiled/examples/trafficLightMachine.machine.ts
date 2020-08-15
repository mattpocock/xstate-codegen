import { Machine, interpret } from '@xstate/compiled';
import { useMachine } from '@xstate/compiled/react';

type LightEvent =
  | { type: 'TIMER' }
  | { type: 'POWER_OUTAGE' }
  | { type: 'PED_COUNTDOWN'; duration: number };

interface LightContext {
  elapsed: number;
}

const lightMachine = Machine<LightContext, LightEvent, 'lightMachine'>({
  initial: 'green',
  states: {
    green: {
      on: {
        POWER_OUTAGE: 'red',
      },
    },
    yellow: {
      on: {
        POWER_OUTAGE: 'red',
        TIMER: 'red',
      },
    },
    red: {
      initial: 'wait',
      states: {
        stop: {
          on: {
            PED_COUNTDOWN: {
              cond: '',
            },
          },
        },
        wait: {},
        walk: {},
      },
    },
  },
});

const useTrafficLightMachine = () => {
  // We use useCompiledMachine instead of
  // useMachine to avoid function overload problems
  const [state, send] = useMachine(lightMachine, {
    guards: {
      hasCompleted: (context, event) => {
        // Note that the event here is typed exactly
        // to where the guard is used.
        return event.duration === 0 && context.elapsed > 0;
      },
    },
  });

  return [state, send];
};

const interpretTrafficLightMachine = () => {
  // We use interpretCompiled instead of
  // interpret to avoid function overload problems
  const interpreter = interpret(lightMachine, {
    guards: {
      hasCompleted: (context, event) => {
        // Note that the event here is typed exactly
        // to where the guard is used.
        return event.duration === 0 && context.elapsed > 0;
      },
    },
  });
  return interpreter;
};
