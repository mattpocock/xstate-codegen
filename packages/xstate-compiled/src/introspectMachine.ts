import 'colors';
import * as XState from 'xstate';
import { toStateValue, toStatePaths, pathToStateValue } from 'xstate/lib/utils';
import { getTransitionsFromNode } from './traversalUtils';

export interface SubState {
  targets: string;
  sources: string;
  states: Record<string, SubState>;
}

const toCompactArray = <T>(maybeArray: T | T[] | undefined): T[] => {
  if (!maybeArray) {
    return [];
  }
  if (Array.isArray(maybeArray)) {
    return maybeArray;
  }
  return [maybeArray];
};

export const getMatchesStates = (machine: XState.StateNode) => {
  const allStateNodes = machine.stateIds.map((id) =>
    machine.getStateNodeById(id),
  );

  const states = allStateNodes.reduce((arr: string[], node) => {
    return [
      ...arr,
      ...toStatePaths(pathToStateValue(node.path)).map((path) =>
        path.join('.'),
      ),
    ];
  }, [] as string[]);

  return states;
};

const makeSubStateFromNode = (
  node: XState.StateNode,
  rootNode: XState.StateNode,
  nodeMaps: {
    [id: string]: {
      sources: Set<string>;
      children: Set<string>;
    };
  },
): SubState => {
  const nodeFromMap = nodeMaps[node.id];

  const stateNode = rootNode.getStateNodeById(node.id);

  const targets = getTransitionsFromNode(stateNode);
  return {
    sources:
      Array.from(nodeFromMap.sources)
        .filter(Boolean)
        .map((event) => `'${event}'`)
        .join(' | ') || 'never',
    targets:
      Array.from(targets)
        .filter(Boolean)
        .map((event) => `'${event}'`)
        .join(' | ') || 'never',
    states: Array.from(nodeFromMap.children).reduce((obj, child) => {
      const childNode = rootNode.getStateNodeById(child);
      return {
        ...obj,
        [childNode.key]: makeSubStateFromNode(childNode, rootNode, nodeMaps),
      };
    }, {}),
  };
};

const xstateRegex = /^xstate\./;

export const introspectMachine = (machine: XState.StateNode) => {
  const actionMaps: { [name: string]: Set<string> } = {};
  const condMaps: { [name: string]: Set<string> } = {};
  const servicesMaps: { [name: string]: Set<string> } = {};
  const nodeMaps: {
    [id: string]: {
      sources: Set<string>;
      children: Set<string>;
    };
  } = {};
  let activities: string[] = [];

  const allStateNodes = machine.stateIds.map((id) =>
    machine.getStateNodeById(id),
  );

  allStateNodes.forEach((node) => {
    nodeMaps[node.id] = {
      sources: new Set(),
      children: new Set(),
    };
  });

  allStateNodes.forEach((node) => {
    Object.values(node.states)?.forEach((childNode) => {
      nodeMaps[node.id].children.add(childNode.id);
    });

    // TODO - make activities pick up the events
    // that led to them
    node.activities?.forEach((activity) => {
      if (/\./.test(activity.type)) return;
      if (activity.type && activity.type !== 'xstate.invoke') {
        activities.push(activity.type);
      }
    });

    node.invoke?.forEach((service) => {
      if (typeof service.src !== 'string' || /\./.test(service.src)) return;
      if (!servicesMaps[service.src]) {
        servicesMaps[service.src] = new Set();
      }
    });

    const on = node.config.on || {};

    if (!Array.isArray(on)) {
      Object.entries(on).forEach(([eventName, transition]) => {
        if (
          !transition ||
          typeof transition === 'string' ||
          // won't be needed in v5
          '__xstatenode' in transition
        ) {
          return;
        }
        toCompactArray(transition).forEach((transition) => {
          if (
            !transition ||
            typeof transition === 'string' ||
            // won't be needed in v5
            '__xstatenode' in transition
          ) {
            return;
          }

          toCompactArray(transition.actions)
            .filter((action): action is string => typeof action === 'string')
            .forEach((action) => {
              if (!actionMaps[action]) {
                actionMaps[action] = new Set();
              }
              actionMaps[action].add(eventName);
            });
        });
      });
    }

    node.transitions?.forEach((transition) => {
      ((transition.target as unknown) as XState.StateNode[])?.forEach(
        (targetNode) => {
          nodeMaps[targetNode.id].sources.add(transition.eventType);
        },
      );
      if (transition.cond && transition.cond.name) {
        if (transition.cond.name !== 'cond') {
          if (!condMaps[transition.cond.name]) {
            condMaps[transition.cond.name] = new Set();
          }
          condMaps[transition.cond.name].add(transition.eventType);
        }
      }

      ((transition.target as unknown) as XState.StateNode[])?.forEach(
        (targetNode) => {
          /** Pick up invokes */
          targetNode.invoke?.forEach((service) => {
            if (typeof service.src !== 'string' || /\./.test(service.src))
              return;
            if (!servicesMaps[service.src]) {
              servicesMaps[service.src] = new Set();
            }
            servicesMaps[service.src].add(transition.eventType);
          });
        },
      );
    });
  });

  allStateNodes.forEach((node) => {
    const allActions: string[] = [];
    const stringEntryActions = toCompactArray(node.config.entry).filter(
      (action): action is string => typeof action === 'string',
    );
    const stringExitActions = toCompactArray(node.config.exit).filter(
      (action): action is string => typeof action === 'string',
    );
    allActions.push(...stringEntryActions);
    allActions.push(...stringExitActions);

    allActions.forEach((action) => {
      if (!actionMaps[action]) {
        actionMaps[action] = new Set();
      }
    });

    stringEntryActions.forEach((action) => {
      const sources = nodeMaps[node.id].sources;

      sources?.forEach((source) => {
        if (!actionMaps[action]) {
          /* istanbul ignore next */
          actionMaps[action] = new Set();
        }
        actionMaps[action].add(source);
      });
    });
  });

  const condLines = Object.entries(condMaps)
    .filter(([name]) => {
      return !/\./.test(name);
    })
    .map(([name, eventSet]) => {
      return {
        name,
        events: Array.from(eventSet).filter(Boolean),
        required: !machine.options.guards[name],
      };
    });

  const actionLines = Object.entries(actionMaps).map(([name, eventSet]) => {
    return {
      name,
      events: Array.from(eventSet).filter(Boolean),
      required: !machine.options.actions[name],
    };
  });

  const serviceLines = Object.entries(servicesMaps)
    .filter(([name]) => {
      return !/\./.test(name);
    })
    .map(([name, serviceSet]) => {
      return {
        name,
        events: Array.from(serviceSet).filter(Boolean),
        required: !machine.options.services[name],
      };
    });

  const subState: SubState = makeSubStateFromNode(machine, machine, nodeMaps);

  return {
    stateMatches: getMatchesStates(machine),
    subState,
    condLines,
    actionLines,
    services: serviceLines,
    activities: Array.from(activities).map((activity) => ({
      name: activity,
      required: !machine.options.activities[activity],
    })),
  };
};
