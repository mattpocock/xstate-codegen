## xstate-codegen

A Typescript codegen CLI for XState.

[Birthed from a twitter rant](https://twitter.com/mpocock1/status/1278374265293877248). Read this to get an idea of what you're getting yourself in for.

This repository is **EXPERIMENTAL**. I'm yet even to do [readme-driven development](https://tom.preston-werner.com/2010/08/23/readme-driven-development.html). Changes are subject to break things.

### Usage

`yarn global add xstate-codegen`

`xstate-codegen "src/**/**.machine.ts"`

Watches any file with a `machine.ts` extension and adds typings for it.

Currently only works with React, but we plan to support other frameworks soon.

Enjoy!
