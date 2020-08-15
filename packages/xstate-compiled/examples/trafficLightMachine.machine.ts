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
  context: { elapsed: 0 },
  id: 'superMachine',
  on: {
    POWER_OUTAGE: {
      target: '.red',
    },
  },
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
        PED_COUNTDOWN: 'red',
      },
    },
    red: {
      on: {
        TIMER: 'green',
        POWER_OUTAGE: '.stop',
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
              cond: 'isSuperCool',
              target: 'wait',
            },
          },
        },
        stop: {
          on: {
            // Transient transition
            '': { target: 'walk' },
          },
        },
      },
    },
  },
});

const useTrafficLightMachine = () => {
  // We use useCompiledMachine instead of
  // useMachine to avoid function overload problems
  const [state, send] = useMachine(lightMachine, {
    guards: {
      isSuperCool: (context, event) => {
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
      isSuperCool: (context, event) => {
        // Note that the event here is typed exactly
        // to where the guard is used.
        return event.duration === 0 && context.elapsed > 0;
      },
    },
  });
  return interpreter;
};
