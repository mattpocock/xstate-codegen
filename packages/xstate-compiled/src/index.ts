#!/usr/bin/env node

import gaze from 'gaze';
import fs from 'fs';
import path from 'path';
import minimist from 'minimist';
import { introspectMachine } from './introspectMachine';
import { extractMachines } from './extractMachines';
import { printToFile } from './printToFile';

const { _: arrayArgs, ...objectArgs } = minimist(process.argv.slice(2));

const [, , pattern] = process.argv;

type RecordOfArrays = Record<string, string[]>;

const flattenRecords = (
  filesAsRecord: Record<string, RecordOfArrays | string[]> | string[],
): string[] => {
  if (Array.isArray(filesAsRecord)) {
    return filesAsRecord;
  }
  return Object.values(filesAsRecord).reduce(
    (array, paths) => array.concat(flattenRecords(paths)),
    [] as any,
  ) as string[];
};

if (!pattern) {
  console.log('You must pass a glob, for instance "**/src/**.machine.ts"');
  process.exit(1);
}

const toRelative = (filePath: string) => path.relative(process.cwd(), filePath);

const typedSuffix = /\.typed\.(js|ts|tsx|jsx)$/;

const tsExtension = /\.(ts|tsx|js|jsx)$/;

let fileCache: Record<string, ReturnType<typeof introspectMachine>> = {};

gaze(pattern, {}, async function(err, watcher) {
  if (err) {
    console.log(err);
    process.exit(1);
  }

  const filesAsRecord: Record<string, string[]> = watcher.watched() as any;

  const files = flattenRecords(filesAsRecord);

  const filteredFiles = files.filter((filePath) => {
    return !typedSuffix.test(filePath) && tsExtension.test(filePath);
  });

  if (filteredFiles.length === 0) {
    console.log('No files found from that glob');
    process.exit(1);
  }

  console.clear();

  const addToCache = async (filePath: string) => {
    const code = fs.readFileSync(filePath, 'utf8');
    if (!code.includes('@xstate/compiled')) {
      return;
    }
    const machines = await extractMachines(filePath);
    if (machines.length === 0) {
      return;
    }
    const { machine, id } = machines[0];
    fileCache[filePath] = introspectMachine(machine, id);
  };

  await filteredFiles.reduce(async (promise, filePath) => {
    await promise;
    try {
      console.log(`Scanning File: `.cyan.bold + toRelative(filePath).gray);
      await addToCache(filePath);
    } catch (e) {
      console.log(e);
      if (objectArgs.once) {
        console.log('Could not complete due to errors'.red.bold);
        // @ts-ignore
        this.close();
        process.exit(1);
      }
    }
  }, Promise.resolve());

  printToFile(fileCache, objectArgs.outDir);

  if (objectArgs.once) {
    console.log('Completed!'.green.bold);
    // @ts-ignore
    this.close();
    process.exit(0);
  }

  // @ts-ignore
  this.on('changed', async (filePath) => {
    console.clear();
    console.log(`File Changed: `.cyan.bold + toRelative(filePath).gray);
    await addToCache(filePath);
    printToFile(fileCache, objectArgs.outDir);
  });
  // @ts-ignore
  this.on('added', async (filePath) => {
    console.clear();
    console.log(`File Added: `.green.bold + toRelative(filePath).gray);
    await addToCache(filePath);
    printToFile(fileCache, objectArgs.outDir);
  });

  console.log(`Watching for file changes in: `.cyan.bold + pattern.gray);
});
