import { Machine } from 'xstate';
import { introspectMachine } from '../introspectMachine';

describe('introspectMachine', () => {
  describe('Matches', () => {
    it('Should calculate matches', () => {
      const machine = Machine({
        initial: 'red',
        states: {
          red: {},
          green: {
            states: {
              gold: {},
            },
          },
        },
      });

      expect(introspectMachine(machine).stateMatches).toEqual([
        'red',
        'green',
        'green.gold',
      ]);
    });
  });

  describe('Actions', () => {
    it('Should extract entry, exit and transitional actions', () => {
      const machine = Machine({
        initial: 'red',
        states: {
          red: {
            entry: 'action1',
            exit: 'action3',
            on: {
              GO: {
                target: 'green',
                actions: ['action2'],
              },
            },
          },
          green: {},
        },
      });

      expect(introspectMachine(machine).actionLines).toEqual([
        {
          name: 'action2',
          events: ['GO'],
        },
        {
          name: 'action3',
          events: [],
        },
        {
          name: 'action1',
          events: [],
        },
      ]);
    });

    it('Should calculate the event which leads to an entry action', () => {
      const machine = Machine({
        initial: 'red',
        states: {
          red: {
            on: {
              GO: {
                target: 'green',
              },
            },
          },
          green: {
            entry: 'action1',
          },
        },
      });

      expect(introspectMachine(machine).actionLines).toEqual([
        {
          name: 'action1',
          events: ['GO'],
        },
      ]);
    });

    it('Should not extract actions declared inline', () => {
      const machine = Machine({
        initial: 'red',
        states: {
          red: {
            on: {
              GO: {
                actions: [
                  () => {
                    console.log('Hey');
                  },
                ],
              },
            },
          },
        },
      });
      expect(introspectMachine(machine).actionLines).toEqual([]);
    });
  });

  describe('Services', () => {
    it('Should calculate the event which leads to a service being invoked', () => {
      const machine = Machine({
        initial: 'red',
        states: {
          red: {
            on: {
              GO: 'green',
            },
          },
          green: {
            invoke: {
              src: 'service',
            },
          },
        },
      });

      expect(introspectMachine(machine).services).toEqual([
        {
          events: ['GO'],
          name: 'service',
        },
      ]);
    });
    it('Should not extract services declared inline', () => {
      const machine = Machine({
        initial: 'red',
        states: {
          red: {
            on: {
              GO: 'green',
            },
          },
          green: {
            invoke: {
              src: () => {
                return Promise.resolve('Hello');
              },
            },
          },
        },
      });
      expect(introspectMachine(machine).services).toEqual([]);
    });
  });

  describe('SubState', () => {
    it('Should calculate subStates properly', () => {
      const machine = Machine({
        initial: 'red',
        states: {
          red: {},
          green: {
            states: {
              gold: {},
            },
          },
        },
      });

      expect(introspectMachine(machine).subState).toEqual({
        sources: 'never',
        targets: "'.red' | '.green' | '.green.gold'",
        states: {
          green: {
            sources: 'never',
            states: {
              gold: {
                sources: 'never',
                targets: "'gold'",
                states: {},
              },
            },
            targets: "'red' | 'green' | 'green.gold' | '.gold'",
          },
          red: {
            sources: 'never',
            targets: "'red' | 'green' | 'green.gold'",
            states: {},
          },
        },
      });
    });
    it('Should calculate events which go to each state', () => {
      const machine = Machine({
        initial: 'red',
        states: {
          red: {
            on: {
              GO: 'green',
            },
          },
          green: {
            on: {
              GO_BACK: 'red',
            },
          },
        },
      });

      expect(introspectMachine(machine).subState.states.green.sources).toEqual(
        "'GO'",
      );
      expect(introspectMachine(machine).subState.states.red.sources).toEqual(
        "'GO_BACK'",
      );
    });
  });
});
