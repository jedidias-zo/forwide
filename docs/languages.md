# Spanish and English

Spanish is the default language. English lives under `/en/`:

- `/` → `/en/`
- `/vision` → `/en/vision`
- `/productos/livecook` → `/en/products/livecook`
- `/contactanos` → `/en/contact`
- `/aviso-legal` → `/en/legal-notice`
- `/privacidad` → `/en/privacy`
- `/proteccion-datos-formularios` → `/en/data-protection`

The language switch links to the equivalent page. Navigation and buttons stay
in the selected language. The HTML language, page titles and alternate-language
links also follow the selected version.

## Editing text in Stacki

Open the Spanish source page and select the `BilingualText` instance on the
canvas (or in Navigator). Open **Settings (D)** and edit its `spanish` and
`english` fields. Both values are prefilled. The selected route determines
which value appears in the preview; the English route reuses the same content.

Page content is authored in `src/pages/index.astro`, `vision.astro`,
`productos/livecook.astro`, `contactanos.astro` and the Spanish legal pages.
Shared header and footer text is authored inside their components; enter the
component to select its `BilingualText` instances. Contact placeholders use
`BilingualField`, with the same two language fields.

Layout, typography and animations are shared by both languages. Some animated
headlines have separate text fragments: retain spaces at fragment boundaries.
There is no automatic translation service; enter both language values.

## Editing images in Stacki

Select the `EditableImage` instance on the canvas or in Navigator. In Settings,
use `src` to choose a replacement asset, and edit `spanishAlt` and `englishAlt`
for the image descriptions. Keep both descriptions empty for decorative images.
The 22 current page image instances use this control. The replacement is shared
between languages and retains the existing layout classes and animation hooks.

The original image remains the fallback inside the section component. Edit the
page's `EditableImage` instance to replace the image used by both routes.
Bitmap artwork containing text is shared artwork; its embedded words do not
translate automatically. Logos, Lottie animations, decorative SVG waves and
intermediate morph frames remain separate assets in their existing components.

## Other translations

`src/i18n/en.ts` and `src/i18n/legal-en.ts` retain translations for metadata,
accessibility labels and component fallbacks. Canvas-authored bilingual fields
are the primary source for visible text. English route files are wrappers;
there is no need to maintain a second layout.

Add future page pairs to `src/i18n/index.ts` and create their English wrappers
under `src/pages/en/`.

## Validation

Run `npm run build`, then `python3 scripts/check-i18n.py`. The check verifies all
page pairs, language metadata, local links, language switches and English copy.
