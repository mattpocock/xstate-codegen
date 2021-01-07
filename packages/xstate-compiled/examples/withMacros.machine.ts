import env from 'penv.macro';
import { Machine } from '@xstate/compiled';

type LightEvent = { type: 'TIMER' } | { type: 'POWER_OUTAGE' };

interface LightContext {
  elapsed: number;
}

const withMacros = Machine<LightContext, LightEvent, 'withMacros'>({
  initial: 'green',
  context: { elapsed: 0 },
  on: {
    POWER_OUTAGE: {
      target: '.red',
    },
  },
  states: {
    green: {
      on: {
        TIMER: env({ development: 'red' }, 'yellow'),
      },
    },
    yellow: {
      on: {
        TIMER: 'red',
      },
    },
    red: {
      on: {
        TIMER: 'green',
      },
    },
  },
});
