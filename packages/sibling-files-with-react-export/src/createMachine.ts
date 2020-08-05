import fs from 'fs';
import path from 'path';
import Handlebars from 'handlebars';
import {
  Machine,
  assign,
  send,
  spawn,
  interpret,
  sendParent,
  actions,
} from 'xstate';
import { raise } from 'xstate/lib/actions';
import * as XState from 'xstate';
import * as babel from '@babel/core';
import helpers from 'handlebars-helpers';
import { execSync } from 'child_process';
import 'colors';

export const createMachine = (filePath: string) => {
  try {
    const file = fs.readFileSync(filePath).toString();
    const fileWithoutImports = file
      .split('\n')
      .filter((line) => !/^import/.test(line))
      .join('\n')
      .replace(/export /g, '')
      .replace(/(const|let|var) (\w{1,}) = Machine/, 'const machine = Machine');

    const parsedFile = babel.transform(fileWithoutImports, {
      filename: filePath,
      plugins: [
        '@babel/plugin-transform-typescript',
        '@babel/plugin-proposal-optional-chaining',
      ],
    });

    const func = new Function(
      'Machine',
      'interpret',
      'assign',
      'send',
      'sendParent',
      'spawn',
      'raise',
      'actions',
      'XState',
      `${(parsedFile || {}).code}; return machine;`,
    );

    let machine: XState.StateNode;

    try {
      machine = func(
        Machine,
        interpret,
        assign,
        send,
        sendParent,
        spawn,
        raise,
        actions,
        XState,
      );
    } catch (e) {
      console.log('ERROR:'.red.bold);
      console.log(e.toString().yellow);
      return;
    }

    if (!machine.id || machine.id === '(machine)') {
      throw new Error('Your machine must have an id property.');
    }

    const getMatchesStates = (machine: XState.StateNode) => {
      const id = machine.id || '(machine)';

      const validStates = machine.stateIds.map((stateId) =>
        stateId.replace(new RegExp(`${id}.`), ''),
      );

      const states = validStates.filter((state) => state !== id);

      return states;
    };

    const actionMaps: { [name: string]: Set<string> } = {};
    const condMaps: { [name: string]: Set<string> } = {};
    const servicesMaps: { [name: string]: Set<string> } = {};
    let activities: string[] = [];

    const allStateNodes = machine.stateIds.map((id) =>
      machine.getStateNodeById(id),
    );

    allStateNodes.forEach((node) => {
      node.activities.forEach((activity) => {
        if (activity.type && activity.type !== 'xstate.invoke') {
          activities.push(activity.type);
        }
      });

      const xstateRegex = /^xstate\./;

      const allActions: XState.ActionObject<any, any>[] = [];
      allActions.push(...node.onEntry);
      allActions.push(...node.onExit);

      allActions.forEach((action) => {
        if (xstateRegex.test(action.type)) return;
        if (!actionMaps[action.type]) {
          actionMaps[action.type] = new Set();
        }
      });

      node.invoke.forEach((service) => {
        if (!servicesMaps[service.src]) {
          servicesMaps[service.src] = new Set();
        }
      });

      node.transitions.forEach((transition) => {
        if (transition.cond && transition.cond.name) {
          if (transition.cond.name !== 'cond') {
            if (!condMaps[transition.cond.name]) {
              condMaps[transition.cond.name] = new Set();
            }
            condMaps[transition.cond.name].add(transition.eventType);
          }
        }

        if (
          ((transition.target as unknown) as XState.StateNode[])?.[0].invoke
            ?.length > 0
        ) {
          ((transition.target as unknown) as XState.StateNode[])?.[0].invoke.forEach(
            (service) => {
              if (!servicesMaps[service.src]) {
                servicesMaps[service.src] = new Set();
              }
              servicesMaps[service.src].add(transition.eventType);
            },
          );
        }
        if (transition.actions) {
          transition.actions.forEach((action) => {
            if (!xstateRegex.test(action.type)) {
              if (!actionMaps[action.type]) {
                actionMaps[action.type] = new Set();
              }
              actionMaps[action.type].add(transition.eventType);
            }
            return {
              name: action.type,
              event: transition.eventType,
            };
          });
        }
      });
    });

    const condLines = Object.entries(condMaps).map(([name, eventSet]) => {
      return {
        name,
        events: Array.from(eventSet).filter(Boolean),
      };
    });

    const actionLines = Object.entries(actionMaps).map(([name, eventSet]) => {
      return {
        name,
        events: Array.from(eventSet).filter(Boolean),
      };
    });

    const serviceLines = Object.entries(servicesMaps).map(
      ([name, serviceSet]) => {
        return {
          name,
          events: Array.from(serviceSet).filter(Boolean),
        };
      },
    );

    const hbTemplateString = fs
      .readFileSync(path.resolve(__dirname, './generatedFile.hbs'))
      .toString();

    helpers({
      handlebars: Handlebars,
    });

    const template = Handlebars.compile(hbTemplateString);

    const result = template({
      id: machine.id,
      stateMatches: getMatchesStates(machine),
      condLines,
      actionLines,
      services: serviceLines,
      activities: Array.from(activities),
    });

    const newFilePath = filePath.replace(
      /\.(ts|js)$/,
      (extension) => `.typed${extension}`,
    );

    fs.writeFileSync(newFilePath, result);
    try {
      execSync(`prettier --write ${newFilePath}`);
    } catch (e) {}
  } catch (e) {
    console.log('ERROR:'.red.bold);
    console.log(e.toString().yellow);
  }
};
