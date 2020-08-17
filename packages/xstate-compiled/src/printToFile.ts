import 'colors';
import fs from 'fs';
import Handlebars from 'handlebars';
import helpers from 'handlebars-helpers';
import path from 'path';
import { introspectMachine } from './introspectMachine';
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

export const printToFile = (
  cache: Record<string, ReturnType<typeof introspectMachine>>,
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
    machine,
  }));

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

  const targetDir = path.resolve(
    path.dirname(packageJson),
    'node_modules/@xstate/compiled',
  );

  fs.writeFileSync(
    path.join(targetDir, 'index.d.ts'),
    indexTemplate({
      machines,
    }),
  );
  fs.writeFileSync(
    path.join(targetDir, 'react.d.ts'),
    reactTemplate({
      machines,
    }),
  );
  fs.writeFileSync(path.join(targetDir, 'index.js'), indexJsTemplate);
  fs.writeFileSync(path.join(targetDir, 'react.js'), reactJsTemplate);
  fs.writeFileSync(path.join(targetDir, 'package.json'), packageJsonTemplate);
};
