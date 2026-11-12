# din.computer

The website for [Din](https://din.computer): a static Astro site, published
as an nsite (NIP-5A) and served by npanel.

```sh
npm ci
npm run dev     # http://localhost:4321
npm run check   # type-check, then build to dist/
```

## Layout

- `src/pages/`: one folder per page. Every page is `/<name>/index.html`
  (nsite gateways resolve `/download/` to `/download/index.html`), and every link ends
  in a slash. `404.astro` is the gateway's fallback.
- `src/data/site.ts`: links that change (the DinOS image, the source
  code) live here.
- `src/data/apps.ts`: `icon()`, which finds a clay app icon by name.
- `src/assets/icons/`: Din's clay app icons, copied from Din's
  `public/icons/apps/`.
- `src/assets/photos/`: the lifestyle photography (generated; "real life,
  with clay in it"). Astro turns them into resized WebP at build time.
- `src/scripts/fireworks.ts`: Din's default click effect, on the site too.

## Deploying

`npm run build`, then publish `dist/` as an nsite.

## License

[AGPL-3.0-or-later](LICENSE), like Din.
