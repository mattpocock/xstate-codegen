#!/usr/bin/env node

import chokidar from 'chokidar';
import fs from 'fs';
import path from 'path';
import minimist from 'minimist';
import { introspectMachine } from './introspectMachine';
import { extractMachines } from './extractMachines';
import { printToFile, printJsFiles } from './printToFile';

const { _: patterns, ...objectArgs } = minimist(process.argv.slice(2));
const onlyOnce = objectArgs.once;

if (patterns.length === 0) {
  console.log(
    'You must pass at least one glob, for instance "**/src/**.machine.ts"',
  );
  process.exit(1);
}

const typedSuffix = /\.typed\.(js|ts|tsx|jsx)$/;
const tsExtension = /\.(ts|tsx|js|jsx)$/;
function isValidFile(filePath: string) {
  return !typedSuffix.test(filePath) && tsExtension.test(filePath);
}

const fileCache: Record<
  string,
  ReturnType<typeof introspectMachine> & { id: string }
> = {};

printJsFiles();
printToFile(fileCache, objectArgs.outDir);
if (!onlyOnce) {
  console.clear();
}

const watcher = chokidar.watch(patterns, {
  persistent: !onlyOnce,
});

watcher.on('error', (err) => {
  console.error(err);
  process.exit(1);
});

const toRelative = (filePath: string) => path.relative(process.cwd(), filePath);

watcher.on('all', async (eventName, filePath) => {
  if (!isValidFile(filePath)) {
    return;
  }
  const relativePath = toRelative(filePath).gray;
  if (eventName === 'add') {
    console.log(`Scanning File: `.cyan.bold + ` ${relativePath}`);
    try {
      await addToCache(filePath);
    } catch (err) {
      console.log(
        `Could not complete due to errors in ${relativePath}`.red.bold,
      );
      console.log(err);
    }
  }
  if (eventName === 'change') {
    console.log(`File Changed: `.yellow.bold + ` ${relativePath}`);
    try {
      await addToCache(filePath);
    } catch (err) {
      console.log(
        `Could not complete due to errors in ${relativePath}`.red.bold,
      );
      console.log(err);
    }
  }
  if (eventName === 'unlink') {
    console.log(`File Deleted: `.red.bold + ` ${relativePath}`);
    removeFromCache(filePath);
  }
  printToFile(fileCache, objectArgs.outDir);
});

process.on('exit', () => {
  if (onlyOnce) {
    // little trick because `ready` doesn't work well to know the inital run is complete
    console.log('Completed!'.green.bold);
  }
});

watcher.on('ready', async () => {
  if (!onlyOnce) {
    patterns.forEach((pattern) => {
      console.log(`Watching for file changes in: `.cyan.bold + pattern);
    });
  }
});

async function addToCache(filePath: string) {
  let code: string = '';
  try {
    code = fs.readFileSync(filePath, 'utf8');
  } catch (e) {}
  if (!code) {
    throw new Error(`Could not read from path ${filePath}`);
  }
  if (!code.includes('@xstate/compiled')) {
    return;
  }
  const machines = await extractMachines(filePath);
  if (machines.length === 0) {
    return;
  }
  const { machine, id } = machines[0];
  fileCache[filePath] = { ...introspectMachine(machine), id };
}

function removeFromCache(filePath: string) {
  delete fileCache[filePath];
}
