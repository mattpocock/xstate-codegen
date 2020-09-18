# Contributing

## Prerequisites

Install `ts-node` by running `npm install -g ts-node` or `yarn global add ts-node`

## Basic Outline

The codebase follows a relatively simple set of steps to generate output that is used by consumers of the library. The state machines are extracted from the user's code by watching a given set of files, the state machines in those files are extracted and introspected, and the types are generated using handlebar templates and and placed into the output directory.

## Code Structure

### Packages

#### `sibling-files-with-react-export`

This watches for machines and does things. TODO: flesh this out

#### `xstate-compiled`

This watches for machines and runs code to extract, introspect, and transform machines into type declarations.

### Examples

Example machines covering many possible scenarios are located in the `examples` folder for each package. These are meant to exercise the different features of the code generator, similarly to a test suite. **If you find an edge case or bug while using xstate-codegen, it would be a big help if the failing machine was added here as an example.**

### Introspecting Machines

The `introspectMachine.ts` file is where a lot of the magic happens. This takes the example machines and traverses the nodes to perform logic based on what items are provided. It aggregates many different properties so that they can be passed along to the handlebars templates to correctly generate type declarations. **If you want to change how a machine is parsed or what information should be gathered about a given machine, this is the place to start.**

### Templates

The `templates` folder in the `xstate-codegen` package contain multiple handlebar templates used to output the types that end up in `node_modules/@xstate/compiled`. The main file of concern in most cases will be `index.d.ts.hbs`. This is where all the generated types are placed for use by the client application. **If you want to change the output of a type declaration file based on the information gathered for a given machine, this is the place to look.**
