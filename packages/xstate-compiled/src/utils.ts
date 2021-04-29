import path from 'path';

export const findLastIndex = <T>(
  arr: T[],
  predicate: (el: T) => boolean,
): number => {
  for (let index = arr.length - 1; index >= 0; index--) {
    if (predicate(arr[index])) {
      return index;
    }
  }
  return -1;
};

export const explodeAbsolutePath = (filePath: string): string[] => {
  if (!path.isAbsolute(filePath)) {
    throw new Error(`Received file path is not an absolute one: ${filePath}`);
  }
  const parsed = path.parse(filePath);
  return [...parsed.dir.slice(parsed.root.length).split(path.sep), parsed.base];
};

export const isNodeModulePath = (
  moduleName: string,
  absoluteFilePath: string,
) => {
  if (!moduleName.length) {
    throw new Error('Received `moduleName` has to be non-empty.');
  }

  const explodedPath = explodeAbsolutePath(absoluteFilePath);
  const nodeModulesIndex = findLastIndex(
    explodedPath,
    (segment) => segment === 'node_modules',
  );

  if (nodeModulesIndex === -1) {
    return false;
  }

  if (moduleName[0] === '@') {
    return (
      `${explodedPath[nodeModulesIndex + 1]}/${
        explodedPath[nodeModulesIndex + 2]
      }` === moduleName
    );
  }

  return explodedPath[nodeModulesIndex + 1] === moduleName;
};
