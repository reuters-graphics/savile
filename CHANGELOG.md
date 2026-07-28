# @reuters-graphics/savile

## 0.2.0

### Minor Changes

- e59cc96: Upgrade to clack 1.x and adopt `@reuters-graphics/clack`.

  **Requires Node >=20.19.0 — this drops support for Node 18.** clack 1.x uses
  `node:util`'s `styleText`, whose array form needs Node >=20.13 and whose
  `FORCE_COLOR`/`NO_COLOR` handling needs >=20.18.

  Also in this release:

  - Removed the local fork of clack's `intro` and `note`. `note` was clack 0.9's
    implementation with the line-dimming removed, and clack 1.6 made no-dim the
    default, so the fork was redundant — upstream's version additionally wraps to
    terminal width, so long image paths no longer overflow the box. `intro` (the
    cyan badge) now comes from `@reuters-graphics/clack`, which renders it
    identically.
  - Fixed a crash on empty prompt input. clack 1.x passes `undefined` to
    `validate` when a text prompt is submitted empty, which the previous
    `value.length === 0` guards would have thrown a `TypeError` on.
  - `intro` and `outro` are now re-exported from the package, so consumers can
    render the same header the CLI does.
  - Fixed a bug where a failed image operation left the spinner running forever
    with the cursor hidden.
  - Dropped the `@clack/core` and `is-unicode-supported` dependencies.

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
