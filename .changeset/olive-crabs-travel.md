---
"xstate-codegen": patch
---

Fixed a bug where transitions from this root node:

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
