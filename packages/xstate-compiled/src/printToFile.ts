import 'colors';
import fs from 'fs';
import Handlebars from 'handlebars';
import helpers from 'handlebars-helpers';
import path from 'path';
import { introspectMachine, SubState } from './introspectMachine';
import pkgUp from 'pkg-up';

const ensureFolderExists = (absoluteDir: string) => {
  if (fs.existsSync(absoluteDir)) {
    return;
  }
  fs.mkdirSync(absoluteDir);
};

const ensureMultipleFoldersExist = (absoluteRoot: string, paths: string[]) => {
  let concatenatedPath = absoluteRoot;

  paths.forEach((dir) => {
    concatenatedPath = path.join(concatenatedPath, dir);
    ensureFolderExists(concatenatedPath);
  });
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

export const getFileTexts = (
  cache: Record<string, ReturnType<typeof introspectMachine> & { id: string }>,
) => {
  const indexTemplateString = fs
    .readFileSync(path.resolve(__dirname, './templates/index.d.ts.hbs'))
    .toString();

  const reactTemplateString = fs
    .readFileSync(path.resolve(__dirname, './templates/react.d.ts.hbs'))
    .toString();

  const indexJsTemplate = fs
    .readFileSync(path.resolve(__dirname, './templates/index.js.hbs'))
    .toString();

  const reactJsTemplate = fs
    .readFileSync(path.resolve(__dirname, './templates/react.js.hbs'))
    .toString();

  const packageJsonTemplate = fs
    .readFileSync(path.resolve(__dirname, './templates/package.json.hbs'))
    .toString();

  helpers({
    handlebars: Handlebars,
  });

  const indexTemplate = Handlebars.compile(indexTemplateString);
  const reactTemplate = Handlebars.compile(reactTemplateString);

  const machines = Object.values(cache).map((machine) => ({
    id: machine.id,
    machine: {
      ...machine,
      subState: renderSubstate(machine.subState),
    },
  }));

  return {
    'index.d.ts': indexTemplate({ machines }),
    'react.d.ts': reactTemplate({ machines }),
    'index.js': indexJsTemplate,
    'react.js': reactJsTemplate,
    'package.json': packageJsonTemplate,
  };
};

export const printToFile = (
  cache: Record<string, ReturnType<typeof introspectMachine> & { id: string }>,
  outDir?: string,
) => {
  const packageJson = pkgUp.sync();

  if (!packageJson) {
    throw new Error(
      'Could not find a package.json in any directory in or above this one.',
    );
  }

  ensureMultipleFoldersExist(path.dirname(packageJson), [
    'node_modules',
    '@xstate',
    'compiled',
  ]);

  ensureMultipleFoldersExist(path.dirname(packageJson), [
    'node_modules',
    '@types',
    'xstate__compiled',
  ]);

  const targetDir = path.resolve(
    path.dirname(packageJson),
    'node_modules/@xstate/compiled',
  );

  const targetTypesDir = path.resolve(
    path.dirname(packageJson),
    'node_modules/@types/xstate__compiled',
  );
  const files = getFileTexts(cache);

  fs.writeFileSync(
    outDir
      ? path.resolve(process.cwd(), outDir, 'index.d.ts')
      : path.join(targetTypesDir, 'index.d.ts'),
    files['index.d.ts'],
  );
  fs.writeFileSync(
    outDir
      ? path.resolve(process.cwd(), outDir, 'react.d.ts')
      : path.join(targetTypesDir, 'react.d.ts'),
    files['react.d.ts'],
  );

  if (outDir) {
    // If the user specifies an outDir, we need to add some dummy types
    // so that we can override something
    fs.writeFileSync(
      path.join(targetTypesDir, 'react.d.ts'),
      `export default any;`,
    );
    fs.writeFileSync(
      path.join(targetTypesDir, 'index.d.ts'),
      `export default any;`,
    );
  }

  fs.writeFileSync(path.join(targetDir, 'index.js'), files['index.js']);
  fs.writeFileSync(path.join(targetDir, 'react.js'), files['react.js']);
  fs.writeFileSync(path.join(targetDir, 'package.json'), files['package.json']);
};
