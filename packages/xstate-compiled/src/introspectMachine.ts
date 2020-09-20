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

class ItemMap {
  /**
   * The internal map that we use to keep track
   * of all of the items
   */
  private map: {
    [name: string]: { events: Set<string>; states: Set<XState.StateValue> };
  } = {};

  /**
   * Check if one of these items is optional -
   * passed in from above via a prop
   */
  private checkIfOptional: (name: string) => boolean;

  constructor(props: { checkIfOptional: (name: string) => boolean }) {
    this.checkIfOptional = props.checkIfOptional;
  }

  /**
   * Add an item to the cache, along with the path of the node
   * it occurs on
   */
  addItem(itemName: string, nodePath: string[]) {
    if (!this.map[itemName]) {
      this.map[itemName] = {
        events: new Set(),
        states: new Set(),
      };
    }
    this.map[itemName].states.add(pathToStateValue(nodePath));
  }

  /**
   * Add a triggering event to an item in the cache, for
   * instance the event type which triggers a guard/action/service
   */
  addEventToItem(itemName: string, eventType: string, nodePath: string[]) {
    this.addItem(itemName, nodePath);
    this.map[itemName].events.add(eventType);
  }

  /**
   * Transform the data into the shape required for index.d.ts
   */
  toDataShape() {
    let isRequiredInTotal = false;
    const lines = Object.entries(this.map)
      .filter(([name]) => {
        return !/\./.test(name);
      })
      .map(([name, data]) => {
        const optional = this.checkIfOptional(name);
        if (!optional) {
          isRequiredInTotal = true;
        }
        return {
          name,
          required: !optional,
          events: Array.from(data.events).filter(Boolean),
          states: Array.from(data.states)
            .map((state) => JSON.stringify(state))
            .filter(Boolean),
        };
      });
    return {
      lines,
      required: isRequiredInTotal,
    };
  }
}

export const introspectMachine = (machine: XState.StateNode) => {
  const guards = new ItemMap({
    checkIfOptional: (name) => Boolean(machine.options.guards[name]),
  });
  const actions = new ItemMap({
    checkIfOptional: (name) => Boolean(machine.options.actions[name]),
  });
  const services = new ItemMap({
    checkIfOptional: (name) => Boolean(machine.options.services[name]),
  });
  const activities = new ItemMap({
    checkIfOptional: (name) => Boolean(machine.options.activities[name]),
  });

  const nodeMaps: {
    [id: string]: {
      sources: Set<string>;
      children: Set<string>;
    };
  } = {};

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
        activities.addItem(activity.type, node.path);
      }
    });

    node.invoke?.forEach((service) => {
      if (typeof service.src !== 'string' || /\./.test(service.src)) return;
      services.addItem(service.src, node.path);
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
              actions.addEventToItem(action, eventName, node.path);
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
          guards.addEventToItem(
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
            services.addEventToItem(
              service.src,
              transition.eventType,
              node.path,
            );
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
      actions.addItem(action, node.path);
    });

    stringEntryActions.forEach((action) => {
      const sources = nodeMaps[node.id].sources;
      sources?.forEach((source) => {
        actions.addEventToItem(action, source, node.path);
      });
    });
  });

  const subState: SubState = makeSubStateFromNode(machine, machine, nodeMaps);

  return {
    stateMatches: getMatchesStates(machine),
    subState,
    guards: guards.toDataShape(),
    actions: actions.toDataShape(),
    services: services.toDataShape(),
    activities: activities.toDataShape(),
  };
};
