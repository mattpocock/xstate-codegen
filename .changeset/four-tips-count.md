---
'xstate-codegen': patch
---

Re-exported other exports from xstate, such as actions, assign, send, sendParent etc. This means you can `import { assign, send, createMachine } from '@xstate/compiled'` without any issues.
