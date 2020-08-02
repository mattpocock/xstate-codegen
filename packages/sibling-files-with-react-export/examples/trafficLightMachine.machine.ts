import { Machine } from 'xstate';
import { useLightMachine } from './trafficLightMachine.machine.typed';

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

const lightMachine = Machine<LightContext, LightStateSchema, LightEvent>({
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

const useTrafficLightMachine = () => {
  const [state, send] = useLightMachine(lightMachine, {
    guards: {
      hasCompleted: (context, event) => {
        // Note that the event here is typed exactly
        // to where the guard is used.
        return event.duration === 0 && context.elapsed > 0;
      },
    },
  });
};
