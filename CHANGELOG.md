# @reuters-graphics/savile

## 0.1.1

### Patch Changes

- d37ca6a: Move `dedent` from devDependencies to dependencies. It's imported at runtime by the built package, so consumers installing `@reuters-graphics/savile` on its own (e.g. in the WebContainer docs demo) hit `ERR_MODULE_NOT_FOUND` for `dedent`.

## 0.1.0

### Minor Changes

- 591b4ad: Select images once, then choose one or more operations (resize, optimise, reformat, make progressive) to run across them in a single pass, instead of re-selecting images for every operation. Added a "max file size" image selection mode alongside query/max-width/all, and a post-run summary showing total file size saved.

## 0.0.4

### Patch Changes

- 22ffe5d: Better messaging for max width resize

## 0.0.3

### Patch Changes

- 6bba8e4: Minor styling

## 0.0.2

### Patch Changes

- 550842a: Adds custom intro and note styling

## 0.0.1

### Patch Changes

- 5bd93e6: Initial release
