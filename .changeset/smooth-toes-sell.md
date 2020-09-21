---
"xstate-codegen": minor
---

Allowed for aliasing services to serviceName.onDone and serviceName.onError. This means that instead of:

```ts
type Event = { type: 'done.invoke.makeFetch'; data: 'data' };
```

You can type it as such:

```ts
type Event = { type: 'makeFetch.onDone'; data: 'data' };
```
