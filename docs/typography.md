# Editing typography in Stacki

The shared styles live in `src/styles/typography.css`. Open the Variables panel
and select this stylesheet to edit the H1, H2, H3, Paragraph and Eyebrow groups.
Changing a variable updates every element using that style.

- `heading-h1`: page titles, using the `--h1-*` variables.
- `heading-h2`: section titles, using the `--h2-*` variables.
- `heading-h3`: card titles and smaller headings, using the `--h3-*` variables.
- `paragraph`: body copy, using the `--paragraph-*` variables. Defaults are
  17px, weight 400, line height 21px and colour #0a0a0a.
- `eyebrow`: small section labels, using the `--eyebrow-*` variables.

Each style has size, weight, line-height and letter-spacing controls. Headings
also have a text-transform control. The shared font is `--type-font-family`.
Heading sizes adapt to the viewport with `clamp()`.

To edit a shared class in the Style panel, select an element and choose its
`heading-h1`, `heading-h2`, `heading-h3`, `paragraph` or `eyebrow` class. Select
`src/styles/typography.css` as the source for shared typography edits. For a
global size change, prefer its variable in the Variables panel.

Layout classes still control positioning, width and alignment. Light text on
dark sections remains a separate colour utility to preserve contrast.

The HTML tag controls the document structure; the class controls appearance.
For example, a smaller semantic `<h2>` can use `heading-h3` or `eyebrow` without
changing its role in the page. Legal-document subheadings use `eyebrow`.
