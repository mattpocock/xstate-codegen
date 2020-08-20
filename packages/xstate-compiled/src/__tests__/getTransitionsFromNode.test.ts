import { Machine } from 'xstate';
import { getTransitionsFromNode } from '../traversalUtils';

describe('getTransitionsFromNode', () => {
  it('Should fetch sibling transitions', () => {
    const machine = Machine({
      initial: 'red',
      states: {
        red: {},
        yellow: {},
        green: {},
      },
    });

    expect(getTransitionsFromNode(machine.states.red)).toEqual([
      'red',
      'yellow',
      'green',
    ]);
  });

  it('Should fetch internal transitions', () => {
    const machine = Machine({
      initial: 'red',
      states: {
        red: {},
        green: {},
      },
    });

    expect(getTransitionsFromNode(machine)).toEqual(['.red', '.green']);
  });

  it('Should fetch children of internal transitions', () => {
    const machine = Machine({
      initial: 'red',
      states: {
        red: {
          states: {
            a: {},
            b: {},
          },
        },
        green: {},
      },
    });

    expect(getTransitionsFromNode(machine)).toEqual([
      '.red',
      '.red.a',
      '.red.b',
      '.green',
    ]);
  });

  it('Should fetch nested transitions to sibling nodes', () => {
    const machine = Machine({
      initial: 'red',
      states: {
        red: {
          states: {
            a: {
              states: {
                c: {},
              },
            },
            b: {},
          },
        },
        yellow: {},
        green: {},
      },
    });

    expect(getTransitionsFromNode(machine.states.yellow)).toEqual([
      'red',
      'yellow',
      'green',
      'red.a',
      'red.a.c',
      'red.b',
    ]);
  });
  it('Should fetch transitions to ids', () => {
    const machine = Machine({
      initial: 'red',
      states: {
        red: {
          states: {
            a: {
              states: {
                c: {},
              },
            },
            b: {},
          },
        },
        yellow: {
          id: 'topLevelStateWithId',
          states: {
            deep: {
              id: 'nestedStateWithId',
              states: {
                nested: {},
              },
            },
          },
        },
      },
    });

    expect(
      getTransitionsFromNode(machine.states.red.states.a.states.c),
    ).toEqual([
      'c',
      '#topLevelStateWithId',
      '#topLevelStateWithId.deep',
      '#topLevelStateWithId.deep.nested',
      '#nestedStateWithId',
      '#nestedStateWithId.nested',
    ]);
  });

  it('Should allow transitions to itself, but not to any of its direct parents', () => {
    const machine = Machine({
      initial: 'red',
      states: {
        red: {
          states: {
            a: {
              states: {
                c: {},
              },
            },
          },
        },
      },
    });

    expect(
      getTransitionsFromNode(machine.states.red.states.a.states.c),
    ).toEqual(['c']);
  });
  it('Should allow a top-level id to access all of the state machine', () => {
    const machine = Machine({
      initial: 'red',
      id: 'superMachine',
      states: {
        red: {
          states: {
            a: {
              states: {
                c: {},
              },
            },
          },
        },
      },
    });

    expect(
      getTransitionsFromNode(machine.states.red.states.a.states.c),
    ).toEqual([
      'c',
      '#superMachine.red',
      '#superMachine.red.a',
      '#superMachine.red.a.c',
    ]);
  });
  it('Should not return the full path for a sibling, only its relative path', () => {
    const machine = Machine({
      initial: 'red',
      states: {
        red: {
          states: {
            a: {
              states: {
                c: {},
                d: {},
              },
            },
          },
        },
      },
    });
    expect(
      getTransitionsFromNode(machine.states.red.states.a.states.c),
    ).toEqual(['c', 'd']);
  });
  it('Should not fetch the detailed path of the parent', () => {
    const machine = Machine({
      initial: 'red',
      states: {
        red: {
          states: {
            nested1: {
              states: {
                c: {},
                d: {},
              },
            },
            nested2: {
              states: {
                e: {},
                f: {},
              },
            },
          },
        },
      },
    });
    expect(getTransitionsFromNode(machine.states.red.states.nested1)).toEqual([
      'nested1',
      'nested2',
      'nested1.c',
      'nested1.d',
      'nested2.e',
      'nested2.f',
      '.c',
      '.d',
    ]);
  });
});
