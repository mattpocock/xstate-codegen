import 'colors';
import * as XState from 'xstate';
import { toStateValue, toStatePaths, pathToStateValue } from 'xstate/lib/utils';
import { getTransitionsFromNode } from './traversalUtils';

export interface SubState {
  targets: string;
  sources: string;
  states: Record<string, SubState>;
}

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

const renderSubstate = (subState: SubState): string => {
  return `{
    targets: ${subState.targets};
    sources: ${subState.sources};
    states: {
      ${Object.entries(subState.states)
        .map(([key, state]) => {
          return `${key}: ${renderSubstate(state)}`;
        })
        .join('\n')}
    };
  }`;
};

const xstateRegex = /^xstate\./;

export const introspectMachine = (machine: XState.StateNode, id: string) => {
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

  allStateNodes?.forEach((node) => {
    nodeMaps[node.id] = {
      sources: new Set(),
      children: new Set(),
    };
  });

  allStateNodes?.forEach((node) => {
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

      if (
        ((transition.target as unknown) as XState.StateNode[])?.[0].invoke
          ?.length > 0
      ) {
        ((transition.target as unknown) as XState.StateNode[])?.[0].invoke?.forEach(
          (service) => {
            if (typeof service.src !== 'string' || /\./.test(service.src))
              return;
            if (!servicesMaps[service.src]) {
              servicesMaps[service.src] = new Set();
            }
            servicesMaps[service.src].add(transition.eventType);
          },
        );
      }
      if (transition.actions) {
        transition.actions?.forEach((action) => {
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

  allStateNodes?.forEach((node) => {
    const allActions: XState.ActionObject<any, any>[] = [];
    allActions.push(...node.onExit);
    allActions.push(...node.onEntry);

    allActions?.forEach((action) => {
      if (xstateRegex.test(action.type) || action.exec) return;
      if (!actionMaps[action.type]) {
        actionMaps[action.type] = new Set();
      }
    });

    node.onEntry?.forEach((action) => {
      const sources = nodeMaps[node.id].sources;
      sources?.forEach((source) => {
        if (!actionMaps[action.type]) {
          actionMaps[action.type] = new Set();
        }
        actionMaps[action.type].add(source);
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
      };
    });

  const actionLines = Object.entries(actionMaps)
    .filter(([name]) => {
      return !/\./.test(name);
    })
    .map(([name, eventSet]) => {
      return {
        name,
        events: Array.from(eventSet).filter(Boolean),
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
      };
    });

  const subState: SubState = makeSubStateFromNode(machine, machine, nodeMaps);

  return {
    id,
    stateMatches: getMatchesStates(machine),
    subState: renderSubstate(subState),
    condLines,
    actionLines,
    services: serviceLines,
    activities: Array.from(activities),
  };
};
