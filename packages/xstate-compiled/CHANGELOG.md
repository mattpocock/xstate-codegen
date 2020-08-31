# xstate-codegen

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
