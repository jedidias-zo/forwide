# Cloudflare Workers deployment

This Astro project generates static pages. Wrangler deploys `dist` as static
assets; an Astro Cloudflare adapter is not required.

Cloudflare Git build settings:

- Root directory: repository root
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Node version: `24`

The Cloudflare Worker name must match `name` in `wrangler.jsonc` (currently
`forwide`). Update that field if the connected Worker has a different name.

Run `npm run build` and `npx wrangler deploy --dry-run` to validate locally.
`npm run deploy` builds and deploys from an authenticated local session.

Do not run `astro add cloudflare` during deployment: the explicit Wrangler
configuration already describes the static assets to upload.
