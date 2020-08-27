# xstate-codegen

## 0.1.0-next.1

### Patch Changes

- 53fe8ae: Fixed a bug where multiple transition targets would only result in the first target being read, which means some invoked services were being typed incorrectly
- 7ff4a59: NON-USER-FACING: Added test suites to cover some key functions
- 4adaba5: Removed old readme and updated repository link in npm

## 0.1.0-next.0

### Minor Changes

- Rewrote the entire codegen tool to put declaration files inside an `@xstate/compiled` module in `node_modules`. Users are now required to use the codegen tool differently, as described in the readme.
