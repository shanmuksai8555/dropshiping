# Lumen Market — scroll-scrubbed homepage ("Ora"-style)

An original homepage for the Lumen Market dropshipping store (placeholder name). A 240-frame WebP
sequence of a concept smartwatch is scrubbed on a `<canvas>` as you scroll: it turns, comes apart
chapter by chapter, then settles back into a hero pose. A real-progress preloader sits in front.

Inspired by the public one-line description of Scrolltide's "Ora" template. No Scrolltide code,
prompt or assets are used; the frames are rendered by our own script.

**No animation library.** All motion is native scroll + `requestAnimationFrame` + canvas `drawImage`.
Runtime dependencies are only `react` and `react-dom`.

## Run

```bash
npm ci
npm run dev        # http://localhost:5173/dropshiping/
npm run build      # type-check + production build into dist/
npm run preview    # serves dist at http://localhost:4173/dropshiping/
```

The site is built for GitHub Pages under `/dropshiping/` (`base` in `vite.config.ts`). Every runtime
asset path goes through `import.meta.env.BASE_URL`, so changing `base` moves everything.

Deploy: `.github/workflows/pages.yml` builds and deploys on every push to `main` (or manually via
*Run workflow*). In the repo settings, **Pages → Source must be "GitHub Actions"** for it to publish.

## Frames

```bash
npm run render:frames            # all 240 → public/frames/0001.webp … 0240.webp (~2 min)
node scripts/render-frames.mjs --only=0,120,239 --out=/tmp/preview   # quick look at a few
npm run contact-sheet -- sheet.png                                   # every 20th frame in a grid
```

`scripts/render/scene.js` builds the watch from procedural three.js geometry (case, crown, glass,
display, logic board, battery, back cover, two straps) and animates it per frame:

| frames  | what happens                                    |
|---------|-------------------------------------------------|
| 1–60    | assembled, slow turn                            |
| 61–180  | straps detach (±Y), glass + display lift (+Z), board + battery drop back (−Z), back cover and crown leave |
| 181–240 | everything reassembles and settles into the hero pose |

`scripts/render-frames.mjs` serves the scene locally, renders it in headless Chrome
(`puppeteer-core`, SwiftShader), adds an edge vignette so frames fade to `#060608`, and encodes WebP
with `sharp` (q78). 1600×1000, ~17 KB average, ~4 MB total. `three`, `puppeteer-core` and `sharp` are
devDependencies used only by this script; none of them is imported by the site.

## Loading strategy

* Frame 1 is `<link rel=preload>`ed.
* The preloader waits for a **gate set**: frame 1, every 4th frame and the hero frame (61 frames,
  about 1 MB). Its percentage is the real count of gate frames that finished downloading **and**
  decoding (`img.decode()`).
* At 100% it fades out; the other 179 frames stream in at low concurrency. Until a frame arrives the
  canvas draws the nearest decoded one, so scrubbing works straight away and just gets smoother.
* A frame that fails still counts as settled (shown as "skipped"), so the preloader can't hang. After
  12 s a "Continue anyway" link appears for very slow connections.
* `HTMLImageElement` + `decode()` rather than `ImageBitmap`: 240 decoded 1600×1000 bitmaps would pin
  ~1.5 GB; the browser can evict and re-decode image data under memory pressure.
* Redraws are rAF-throttled and only happen when the frame index (or the nearest available image)
  changes. Canvas is DPR-aware (capped at 2×). Landscape uses cover-fit; tall portrait screens scale
  so the central ~860 px of the frame (the exploded product) is never cropped, and the letterbox is
  feathered into the background colour.
* `prefers-reduced-motion: reduce` → no preloader, no scrub: one static hero frame plus the four
  chapters stacked as normal content.

## Pages

* `/dropshiping/` — this homepage.
* `/dropshiping/shop.html` — the earlier Three.js product-viewer prototype, with invented product
  counts, discounts and delivery promises removed, and a “Sample products and prices, for preview only”
  label on the page. Category links pass `?category=<slug>`, which the prototype does not read yet.

## What is placeholder

* **"Lumen Market"** is a placeholder brand name.
* **"Lumen One"** is an illustrative concept render, not a real or listed product; the page says so.
* **WhatsApp VIP form** validates an Indian mobile (+91 optional) and shows a thank-you, but sends and
  stores nothing. See `TODO(lead-capture)` in `src/components/JoinForm.tsx` (POST `/api/lead` →
  Google Sheets).
* **shop.html** shows four sample products and prices, labelled “for preview only”.
* No prices, reviews, ratings, order counts or delivery promises appear on the homepage.
* Fonts (Instrument Sans, Instrument Serif, JetBrains Mono; SIL OFL) are self-hosted from `src/assets/fonts`.

## QA script

`scripts/verify-shots.mjs` (needs `npm run preview` running): checks for 4xx/5xx and page errors,
`scrollWidth <= innerWidth` at 390/768/1280/1920, and saves screenshots.
