# xstate-codegen

## 0.1.2

### Patch Changes

- af655bf: Added typing of options passed in to the second argument of Machine/createMachine. These options will be optional in the Machine, and any declared in the Machine will be optional when the machine is interpreted.
- 1cd0df9: Fixed a bug where transitions from this root node:

  ```
  const machine = Machine({
    initial: 'red',
    states: {
      red: {},
      green: {},
    },
  });
  ```

  Would include `.red` and `.green`, but not `red` and `green`,

- 64e946f: Added a listener for when files are deleted

## 0.1.1

### Patch Changes

- 8c0e12a: Improved type checking speed in VSCode by rimraffing the .d.ts files before regenerating them

## 0.1.0

### Minor Changes

- 7b5d747: Rewrote the entire codegen tool to put declaration files inside an `@xstate/compiled` module in `node_modules`. Users are now required to use the codegen tool differently, as described in the readme.

### Patch Changes

- c87691e: Fix typo in readme
- 1b05467: Fixed a bug with InterpreterWithMatches caused by an early release of StateWithMatches work
- 53fe8ae: Fixed a bug where multiple transition targets would only result in the first target being read, which means some invoked services were being typed incorrectly
- 9dfbc38: Refactored StateWithMatches to take an Id parameter, instead of a \_matches param. This makes it easier to make generic.
- f802dc0: Re-exported other exports from xstate, such as actions, assign, send, sendParent etc. This means you can `import { assign, send, createMachine } from '@xstate/compiled'` without any issues.
- 7ff4a59: NON-USER-FACING: Added test suites to cover some key functions
- e0b0bcf: fixed a bug where rollup was converting relative file paths to absolute and then treating the files as external causing the watched files to fail with 'Unexpected Syntax' errors.
- 101fd74: Added type compatible useService to the react type declaration template. It is used for spawned xstate-codegen machines.
- b9378fc: Fixed a bug where, when run for the first time, the codegen tool would fail because rollup would see no .js files in the @xstate/compiled node_module directory
- 4adaba5: Removed old readme and updated repository link in npm
- bf4a125: Fixed bug with build process that resulted in the previous version not being shipped correctly
- c5238ad: Readme tweak

## 0.1.0-next.8

### Patch Changes

- e0b0bcf: fixed a bug where rollup was converting relative file paths to absolute and then treating the files as external causing the watched files to fail with 'Unexpected Syntax' errors.

## 0.1.0-next.7

### Patch Changes

- c5238ad: Readme tweak

## 0.1.0-next.6

### Patch Changes

- bf4a125: Fixed bug with build process that resulted in the previous version not being shipped correctly

## 0.1.0-next.5

### Patch Changes

- Fixed a bug with InterpreterWithMatches caused by an early release of StateWithMatches work
- 9dfbc38: Refactored StateWithMatches to take an Id parameter, instead of a \_matches param. This makes it easier to make generic.

## 0.1.0-next.4

### Patch Changes

- b9378fc: Fixed a bug where, when run for the first time, the codegen tool would fail because rollup would see no .js files in the @xstate/compiled node_module directory

## 0.1.0-next.3

### Patch Changes

- c87691e: Fix typo in readme
- f802dc0: Re-exported other exports from xstate, such as actions, assign, send, sendParent etc. This means you can `import { assign, send, createMachine } from '@xstate/compiled'` without any issues.

## 0.1.0-next.2

### Patch Changes

- 101fd74: Added type compatible useService to the react type declaration template. It is used for spawned xstate-codegen machines.

## 0.1.0-next.1

### Patch Changes

- 53fe8ae: Fixed a bug where multiple transition targets would only result in the first target being read, which means some invoked services were being typed incorrectly
- 7ff4a59: NON-USER-FACING: Added test suites to cover some key functions
- 4adaba5: Removed old readme and updated repository link in npm

## 0.1.0-next.0

### Minor Changes

- Rewrote the entire codegen tool to put declaration files inside an `@xstate/compiled` module in `node_modules`. Users are now required to use the codegen tool differently, as described in the readme.
