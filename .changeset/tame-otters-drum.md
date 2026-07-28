---
'@reuters-graphics/savile': patch
---

Move `dedent` from devDependencies to dependencies. It's imported at runtime by the built package, so consumers installing `@reuters-graphics/savile` on its own (e.g. in the WebContainer docs demo) hit `ERR_MODULE_NOT_FOUND` for `dedent`.
