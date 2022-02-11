import * as t from '@babel/types';
import * as fs from 'fs';
import path from 'path';
import { createMachine, MachineOptions, StateMachine } from 'xstate';
import { parseMachinesFromFile } from 'xstate-parser-demo';

const cwd = process.cwd();

const getMachineId = (importName: string, callExpression: t.CallExpression) => {
  const { typeParameters } = callExpression;

  if (
    !typeParameters ||
    !typeParameters.params[2] ||
    !t.isTSLiteralType(typeParameters.params[2]) ||
    !t.isStringLiteral(typeParameters.params[2].literal)
  ) {
    console.log('You must pass three type arguments to your machine.');
    console.log();
    console.log('For instance:');
    console.log(
      `const machine = ${importName}<Context, Event, 'aUniqueIdForYourMachine'>({})`,
    );
    console.log();
    throw new Error('You must pass three type arguments to your machine.');
  }
  return typeParameters.params[2].literal.value;
};

type ExtractedMachine = {
  id: string;
  machine: StateMachine<any, any, any>;
};

export const extractMachines = async (
  filePath: string,
): Promise<ExtractedMachine[]> => {
  const resolvedFilePath = path.resolve(cwd, filePath);

  const fileContents = fs.readFileSync(resolvedFilePath).toString();

  const result = parseMachinesFromFile(fileContents);

  return result.machines.map((machine) => {
    const config = machine.toConfig() || {};
    const options: Partial<MachineOptions<any, any>> = {};

    if (!machine.ast) throw new Error();

    const id = getMachineId(
      machine.ast?.calleeName || '',
      machine.ast?.node as any,
    );

    machine.ast?.options?.actions?.properties.forEach((action) => {
      if (!options.actions) {
        options.actions = {};
      }

      options.actions[action.key] = () => {};
    });

    machine.ast?.options?.services?.properties.forEach((property) => {
      if (!options.services) {
        options.services = {};
      }

      options.services[property.key] = () => () => {};
    });

    machine.ast?.options?.guards?.properties.forEach((property) => {
      if (!options.guards) {
        options.guards = {};
      }

      options.guards[property.key] = () => true;
    });

    machine.ast?.options?.delays?.properties.forEach((property) => {
      if (!options.delays) {
        options.delays = {};
      }

      options.delays[property.key] = 500;
    });

    return {
      id,
      machine: createMachine(config, options),
    };
  });
};
