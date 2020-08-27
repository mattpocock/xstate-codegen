---
'xstate-codegen': patch
---

Fixed a bug where multiple transition targets would only result in the first target being read, which means some invoked services were being typed incorrectly
