# Savile

Tailors your images for the perfect web fit.

![](./logo.png)

## Install

```console
pnpm i -D @reuters-graphics/savile
```

## Using as CLI

```console
Description
  Resize, reformat or optimise images in a directoy.

Usage
  $ savile row <imagesDir> [options]

Options
  -h, --help    Displays this message

Examples
  $ savile row ./src/statics/images
```

## Using as a module

```typescript
import { Savile } from '@reuters-graphics/savile';

const savile = new Savile('./src/statics/images');

await savile.findImages();

await savile.row();
```