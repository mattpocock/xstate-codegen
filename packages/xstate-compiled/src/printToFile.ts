import 'colors';
import fs from 'fs';
import Handlebars from 'handlebars';
import helpers from 'handlebars-helpers';
import path from 'path';
import { introspectMachine, SubState } from './introspectMachine';
import pkgUp from 'pkg-up';
import rimraf from 'rimraf';

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

export const getDeclarationFileTexts = (
  cache: Record<string, ReturnType<typeof introspectMachine> & { id: string }>,
) => {
  const indexTemplateString = fs
    .readFileSync(path.resolve(__dirname, './templates/index.d.ts.hbs'))
    .toString();

  const reactTemplateString = fs
    .readFileSync(path.resolve(__dirname, './templates/react.d.ts.hbs'))
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
  };
};

export const getNodeModulesDir = (cwd: string) => {
  const packageJson = pkgUp.sync({
    cwd,
  });

  if (!packageJson) {
    throw new Error(
      'Could not find a package.json in any directory in or above this one.',
    );
  }

  const targetDir = path.resolve(path.dirname(packageJson), 'node_modules');

  return targetDir;
};

export const printToFile = ({
  cache,
  outDir,
  cwd,
}: {
  cache: Record<string, ReturnType<typeof introspectMachine> & { id: string }>;
  outDir?: string;
  cwd: string;
}) => {
  const files = getDeclarationFileTexts(cache);
  const nodeModulesDir = getNodeModulesDir(cwd);
  const targetDir = path.resolve(nodeModulesDir, '@xstate/compiled');

  /** Delete @xstate/compiled directory so that it triggers VSCode to re-check it */
  rimraf.sync(path.join(targetDir, '*.d.ts'));

  printJsFiles(cwd);
  ensureMultipleFoldersExist(nodeModulesDir, ['@xstate', 'compiled']);

  fs.writeFileSync(
    outDir
      ? path.resolve(cwd, outDir, 'index.d.ts')
      : path.join(targetDir, 'index.d.ts'),
    files['index.d.ts'],
  );
  fs.writeFileSync(
    outDir
      ? path.resolve(cwd, outDir, 'react.d.ts')
      : path.join(targetDir, 'react.d.ts'),
    files['react.d.ts'],
  );

  if (outDir) {
    // If the user specifies an outDir, we need to add some dummy types
    // so that we can override something
    fs.writeFileSync(path.join(targetDir, 'react.d.ts'), `export default any;`);
    fs.writeFileSync(path.join(targetDir, 'index.d.ts'), `export default any;`);
  }
};

/**
 * Prints the js files, which needs to be done in advance
 * of rollup looking at the code to ensure there is a module for rollup
 * to statically analyse
 */
export const printJsFiles = (cwd: string) => {
  const nodeModulesDir = getNodeModulesDir(cwd);
  const targetDir = path.resolve(nodeModulesDir, '@xstate/compiled');

  ensureMultipleFoldersExist(nodeModulesDir, ['@xstate', 'compiled']);

  const indexJsTemplate = fs
    .readFileSync(path.resolve(__dirname, './templates/index.js.hbs'))
    .toString();

  const reactJsTemplate = fs
    .readFileSync(path.resolve(__dirname, './templates/react.js.hbs'))
    .toString();

  const packageJsonTemplate = fs
    .readFileSync(path.resolve(__dirname, './templates/package.json.hbs'))
    .toString();

  fs.writeFileSync(path.join(targetDir, 'index.js'), indexJsTemplate);
  fs.writeFileSync(path.join(targetDir, 'react.js'), reactJsTemplate);
  fs.writeFileSync(path.join(targetDir, 'package.json'), packageJsonTemplate);
};
