import 'colors';
import * as XState from 'xstate';
import { toStatePaths, pathToStateValue } from 'xstate/lib/utils';
import { getTransitionsFromNode } from './traversalUtils';

export interface SubState {
  targets: string;
  sources: string;
  stateValue: XState.StateValue;
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
    stateValue: pathToStateValue(node.path),
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

class ItemMap {
  private map: {
    [name: string]: { events: Set<string>; states: Set<XState.StateValue> };
  } = {};

  addItem(itemName: string, nodePath: string[]) {
    if (!this.map[itemName]) {
      this.map[itemName] = {
        events: new Set(),
        states: new Set(),
      };
    }
    this.map[itemName].states.add(pathToStateValue(nodePath));
  }

  addEventToItem(itemName: string, eventType: string, nodePath: string[]) {
    this.addItem(itemName, nodePath);
    this.map[itemName].events.add(eventType);
  }

  toArray() {
    return Object.entries(this.map)
      .filter(([name]) => {
        return !/\./.test(name);
      })
      .map(([name, data]) => {
        return {
          name,
          events: Array.from(data.events).filter(Boolean),
          states: Array.from(data.states)
            .map((state) => JSON.stringify(state))
            .filter(Boolean),
        };
      });
  }
}

const xstateRegex = /^xstate\./;

export const introspectMachine = (machine: XState.StateNode) => {
  const actionMap = new ItemMap();
  const condMap = new ItemMap();
  const serviceMap = new ItemMap();
  const nodeMaps: {
    [id: string]: {
      sources: Set<string>;
      children: Set<string>;
    };
  } = {};
  const activityMap = new ItemMap();

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
        activityMap.addItem(activity.type, node.path);
      }
    });

    node.invoke?.forEach((service) => {
      if (typeof service.src !== 'string' || /\./.test(service.src)) return;
      serviceMap.addItem(service.src, node.path);
    });

    node.transitions?.forEach((transition) => {
      ((transition.target as unknown) as XState.StateNode[])?.forEach(
        (targetNode) => {
          nodeMaps[targetNode.id].sources.add(transition.eventType);
        },
      );
      if (transition.cond && transition.cond.name) {
        if (transition.cond.name !== 'cond') {
          condMap.addEventToItem(
            transition.cond.name,
            transition.eventType,
            node.path,
          );
        }
      }

      ((transition.target as unknown) as XState.StateNode[])?.forEach(
        (targetNode) => {
          /** Pick up invokes */
          targetNode.invoke?.forEach((service) => {
            if (typeof service.src !== 'string' || /\./.test(service.src))
              return;
            serviceMap.addEventToItem(
              service.src,
              transition.eventType,
              targetNode.path,
            );
          });
        },
      );

      if (transition.actions) {
        transition.actions?.forEach((action) => {
          if (!xstateRegex.test(action.type)) {
            actionMap.addEventToItem(
              action.type,
              transition.eventType,
              node.path,
            );
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
      actionMap.addItem(action.type, node.path);
    });

    node.onEntry?.forEach((action) => {
      const sources = nodeMaps[node.id].sources;
      sources?.forEach((source) => {
        actionMap.addEventToItem(action.type, source, node.path);
      });
    });
  });

  const subState: SubState = makeSubStateFromNode(machine, machine, nodeMaps);

  return {
    stateMatches: getMatchesStates(machine),
    subState,
    condLines: condMap.toArray().map(({ events, name, states }) => {
      return {
        states,
        events,
        name,
        required: !machine.options.guards[name],
      };
    }),
    actionLines: actionMap.toArray().map(({ events, name, states }) => {
      return {
        states,
        events,
        name,
        required: !machine.options.actions[name],
      };
    }),
    services: serviceMap.toArray().map(({ events, name, states }) => {
      return {
        states,
        events,
        name,
        required: !machine.options.services[name],
      };
    }),
    activities: activityMap.toArray().map(({ events, name, states }) => {
      return {
        states,
        events,
        name,
        required: !machine.options.activities[name],
      };
    }),
  };
};
