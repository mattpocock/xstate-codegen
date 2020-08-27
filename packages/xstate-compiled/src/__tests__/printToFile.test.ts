import { Machine } from 'xstate';
import { getFileTexts } from '../printToFile';
import { introspectMachine } from '../introspectMachine';

test('That printToFile matches a snapshot test', () => {
  const machine = Machine({
    initial: 'invokeTest',
    id: 'superMachine',
    on: {},
    states: {
      invokeTest: {
        invoke: {
          src: 'someInvoke',
        },
        onDone: 'testEvent',
      },
      testEvent: {
        on: {
          SOMETHING: 'activityTest',
        },
      },
      activityTest: {
        activities: ['someActivity'],
        on: {
          CONDITION_TEST: [
            {
              cond: 'condition',
              target: 'invokeTest',
            },
          ],
        },
      },
    },
  });

  const files = getFileTexts({
    'index.js': { id: 'something', ...introspectMachine(machine) },
  });

  expect(files['index.d.ts']).toMatchSnapshot();
  expect(files['react.d.ts']).toMatchSnapshot();
});
