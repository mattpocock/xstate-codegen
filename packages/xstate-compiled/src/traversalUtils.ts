import { StateNode } from 'xstate';
import { toStatePaths, pathToStateValue } from 'xstate/lib/utils';

export const getTransitionsFromNode = (node: StateNode): string[] => {
  const transitions = new Set<string>();

  if (node.parent) {
    Object.keys(node.parent.states).forEach((key) => transitions.add(key));
    Object.values(node.parent.states).forEach((siblingNode) => {
      getMatchesStates(siblingNode).forEach((key) => {
        if (key === siblingNode.path.join('.')) {
          return;
        }
        let relativeKey = key;

        if ((node.parent?.path.length || 0) > 0) {
          relativeKey = relativeKey.replace(
            new RegExp(`^${(node.parent as StateNode).path.join('.')}\.`),
            '',
          );
        }

        transitions.add(relativeKey);
      });
    });
  }
  Object.values(node.states).map((childNode) => {
    getMatchesStates(childNode).map((key) => {
      let relativeKey = key;

      if ((childNode.parent?.path.length || 0) > 0) {
        relativeKey = relativeKey.replace(
          new RegExp(`^${(childNode.parent as StateNode).path.join('.')}\.`),
          '',
        );
      }

      transitions.add(`.${relativeKey}`);
    });
  });

  const rootNode = getRootNode(node);

  const nodesWithId = rootNode.stateIds
    .filter((id) => !/(\.|\(machine\))/.test(id))
    .map((id) => rootNode.getStateNodeById(id));

  nodesWithId.forEach((idNode) => {
    getMatchesStates(idNode).forEach((match) => {
      if (idNode.id === rootNode.id) {
        transitions.add(`#${idNode.id}.${match}`);
        return;
      }

      transitions.add(
        match.replace(new RegExp(`^${idNode.path.join('.')}`), `#${idNode.id}`),
      );
    });
  });

  toStatePaths(pathToStateValue(node.path)).forEach((path) => {
    if (path.length > 1) {
      transitions.delete(path.join('.'));
    }
  });

  return Array.from(transitions);
};

export const getMatchesStates = (machine: StateNode) => {
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

export const getRootNode = (node: StateNode): StateNode => {
  if (!node.parent) {
    return node;
  }
  return getRootNode(node.parent);
};
