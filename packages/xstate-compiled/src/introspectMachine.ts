import 'colors';
import * as XState from 'xstate';

export const getMatchesStates = (machine: XState.StateNode) => {
  const id = machine.id || '(machine)';

  const validStates = machine.stateIds.map((stateId) =>
    stateId.replace(new RegExp(`${id}.`), ''),
  );

  const states = validStates.filter((state) => state !== id);

  return states;
};

export const introspectMachine = (machine: XState.StateNode, id: string) => {
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

  return {
    id,
    stateMatches: getMatchesStates(machine),
    condLines,
    actionLines,
    services: serviceLines,
    activities: Array.from(activities),
  };
};
