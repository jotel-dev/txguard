# TxGuard identity · Letterform

The owner selected **Letterform — geometric T/G monogram** from the three concepts in this session before the application logo was replaced. [Review all three concepts](concepts.html). This approval concerns the brand direction and development integration; it does not approve a production deployment.

The mark connects a precise T with an open G. Use a flat silhouette with generous clear space, without a shield, padlock, coin, gradient or ornamental effects. The existing blue remains **#2563eb**. Primary text is **#111827**, supporting text **#475569**, with white and black single-color alternatives. These are visual identity assets, not security certifications or trademark clearance.

## Production assets

All files are in [`web/public/brand/`](../../web/public/brand/). Logo PNGs have transparent backgrounds; icon/preview backgrounds are deliberately solid where platform cropping or previews require it.

| Use | Files |
| --- | --- |
| Primary two-color horizontal lockup | `txguard-primary.svg`, `txguard-primary.png` |
| Horizontal, one color | `txguard-horizontal-{blue,black,white}.{svg,png}` |
| Standalone symbol | `txguard-symbol-{blue,black,white}.{svg,png}` |
| Social profile | `txguard-profile.png`, 1024×1024 |
| Social sharing | `txguard-open-graph.png`, 1200×630 |
| Favicon | `web/public/favicon.svg`, `web/public/favicon.ico` (16/32/48px), `brand/favicon-{16,32,48}.png` |
| Apple touch icon | `web/public/apple-touch-icon.png`, 180×180 |
| Sizes, byte counts and PNG integrity hashes | `raster-manifest.json` |
| Typeface license | `FONT-LICENSE.txt` (SIL Open Font License for Space Grotesk) |

SVG text has been converted to outlines; exported logos need no installed font or network request. Use the symbol rather than the tagline lockup at favicon sizes. Minimum symbol size is 16px; prefer 24px or larger. Keep at least one stroke-width of clear space around the symbol. Keep the primary lockup at least 180px wide when the tagline must be readable. For navigation at smaller sizes, the app uses the symbol with its readable text wordmark and presents the full tagline separately on the page.

Do not distort proportions, add outlines/shadows, substitute the mark for a risk indicator, or use the white mark on a light surface. The small-size specimens in the concept board and actual exported browser icons were reviewed. Native OS icon cropping and real social-network caching still require post-deployment checking after approval.

## Reproduction

From the repository root on Windows:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File web/scripts/export-brand.ps1
node web/scripts/render-brand-assets.mjs
```

The first command applies execution policy only to that process. It uses the existing licensed Space Grotesk source font and .NET vector outlines; it does not install fonts or change permanent policy. The second uses the existing Playwright dependency and installed Edge to rasterize the vectors. No image-generation API, paid service, production dependency or runtime animation library is introduced. The application uses a tiny inline symbol component; the large profile/Open Graph assets are not requested on ordinary page loads.

For preview, open [`txguard-primary.svg`](../../web/public/brand/txguard-primary.svg) or [`txguard-open-graph.png`](../../web/public/brand/txguard-open-graph.png). The three exploratory concept assets are retained as design documentation, not alternate active application logos.
