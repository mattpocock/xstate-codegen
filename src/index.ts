#!/usr/bin/env node

import gaze from 'gaze';
import { createMachine } from './createMachine';
import path from 'path';

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

gaze(pattern, {}, function (err, watcher) {
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
  filteredFiles.forEach((fileName) => {
    console.log(
      `Creating Type File: `.cyan.bold +
        toRelative(
          fileName.replace(/\.(ts|js)$/, (extension) => `.typed${extension}`),
        ).gray,
    );
    createMachine(fileName);
  });

  // @ts-ignore
  this.on('changed', (fileName) => {
    console.clear();
    console.log(`File Changed: `.cyan.bold + toRelative(fileName).gray);
    createMachine(fileName);
  });
  // @ts-ignore
  this.on('added', (fileName) => {
    console.clear();
    console.log(`File Added: `.green.bold + toRelative(fileName).gray);
    createMachine(fileName);
  });

  console.log(`Watching for file changes in: `.cyan.bold + pattern.gray);
});
