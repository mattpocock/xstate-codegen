import { Machine } from 'xstate';
import { getDeclarationFileTexts } from '../printToFile';
import { introspectMachine } from '../introspectMachine';

test('That printToFile matches a snapshot test', () => {
  const machine = Machine(
    {
      initial: 'invokeTest',
      id: 'superMachine',
      on: {},
      states: {
        invokeTest: {
          invoke: [
            {
              src: 'someInvoke',
            },
            {
              src: 'notRequiredInvoke',
            },
          ],
          onDone: 'testEvent',
        },
        testEvent: {
          entry: ['action', 'notRequiredAction'],
          on: {
            SOMETHING: 'activityTest',
          },
        },
        activityTest: {
          activities: ['someActivity', 'notRequiredActivity'],
          on: {
            CONDITION_TEST: [
              {
                cond: 'condition',
                target: 'invokeTest',
              },
              {
                cond: 'notRequiredCondition',
                target: 'invokeTest',
              },
            ],
          },
        },
      },
    },
    {
      actions: {
        notRequiredAction: () => {},
      },
      guards: {
        notRequiredCondition: () => false,
      },
      activities: {
        notRequiredActivity: () => {},
      },
      services: {
        notRequiredInvoke: async () => {},
      },
    },
  );

  const files = getDeclarationFileTexts({
    'index.js': { id: 'something', ...introspectMachine(machine) },
  });

  expect(files['index.d.ts']).toMatchSnapshot();
  expect(files['react.d.ts']).toMatchSnapshot();
});
