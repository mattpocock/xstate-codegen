import { Machine, interpret } from '@xstate/compiled';

interface Context {}

type Event =
  | { type: 'INIT', data: string }
  | { type: 'LOG' }

const machine = Machine<Context, Event, 'callbackServiceMachine'>({
  initial: 'idle',
  states: {
    idle: {
      on: {
        INIT: 'active'
      }
    },
    active: {
      invoke: [
        {
          src: 'listen',
        },
      ],
      on: {
        LOG: {
          actions: 'logAction'
        }
      }
    },
  },
});

interpret(
  machine.withConfig({
    services: {
      listen: (_context, _event) => (send, onReceive) => {
        send({ type: 'LOG' })

        onReceive(e => {
          if (e.type === 'LOG') {
            console.log('log here too')
          }
        })
      }
    },
    actions: {
      logAction: (_context, _event) => console.log('received event')
    },
  }),
);
