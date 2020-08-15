import 'colors';
import fs from 'fs';
import Handlebars from 'handlebars';
import helpers from 'handlebars-helpers';
import path from 'path';
import { introspectMachine } from './introspectMachine';

export const printToFile = (
  cache: Record<string, ReturnType<typeof introspectMachine>>,
) => {
  const hbTemplateString = fs
    .readFileSync(path.resolve(__dirname, './generatedFile.hbs'))
    .toString();

  helpers({
    handlebars: Handlebars,
  });

  const template = Handlebars.compile(hbTemplateString);

  const machines = Object.values(cache).map((machine) => ({
    id: machine.id,
    machine,
  }));

  const result = template({
    machines,
  });

  // TODO - change this to be dynamic
  const newFilePath = path.resolve(process.cwd(), 'xstate-env.d.ts');

  fs.writeFileSync(newFilePath, result);
};
