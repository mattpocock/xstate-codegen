---
'xstate-codegen': patch
---

Fixed a bug where, when run for the first time, the codegen tool would fail because rollup would see no .js files in the @xstate/compiled node_module directory
