---
'xstate-codegen': patch
---

fixed a bug where rollup was converting relative file paths to absolute and then treating the files as external causing the watched files to fail with 'Unexpected Syntax' errors.
