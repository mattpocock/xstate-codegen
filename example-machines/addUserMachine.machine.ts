import { Machine } from 'xstate';

export type AddUserParams = {
  name: string;
  email: string;
  role: 'admin' | 'agent';
  profilePhoto?: string;
};

interface Context {
  createParams?: AddUserParams;
  updateParams?: AddUserParams;
}

type Event =
  | { type: 'SUBMIT_CREATE'; params: AddUserParams }
  | { type: 'SUBMIT_UPDATE'; params: AddUserParams }
  | { type: 'CANCEL' }
  | {
      type: 'REPORT_ERROR';
    };

export const addUserMachine = Machine<Context, Event>({
  initial: 'idle',
  id: 'addUserMachine',
  states: {
    idle: {
      on: {
        CANCEL: 'cancelled',
      },
    },
    cancelled: {
      on: {
        REPORT_ERROR: 'errored',
      },
    },
    errored: {
      invoke: {
        src: 'something',
      },
    },
  },
});
