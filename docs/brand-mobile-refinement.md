# Brand, mobile usability and performance refinement

Development branch: `feat/txguard-demo-readiness`. Source baseline: `ed2c3f5`. Submitted baseline: `d210ec2`. The owner approved the **Letterform T/G monogram** in this conversation before replacement. Production and `main` are preserved; no merge or deployment is part of this work.

## What changed and why

The initial audit found no document-level horizontal overflow, but it reproduced multiple usability defects: 5–11px labels, 35–40px icon targets, 36px Paste/Listen/address-copy/optional-context targets and narrow navigation links. Passing an overflow check had missed these issues. Some mobile input text was smaller than the 16px size that avoids native iOS input zoom.

The refinement preserves the page structure, palette and provider/security architecture while making the product readable and operable:

- Raised numeric font-size declarations below 12px to 12px, with 14px mobile form labels and explanatory text, 16px mobile inputs and fluid hero typography. Heading scale, spacing and wrapping adapt without shrinking important copy into fine print.
- Raised interactive controls to at least 44px, with 48px primary/mobile navigation controls where appropriate. Address-copy controls display the complete saved address and wrap, retaining a useful manual-copy fallback. Transaction history now has a full-hash copy button and specific confirmation announcement.
- Added an in-flow mobile menu at ≤800px with explicit expanded state, a controlled navigation region, current-route states, Escape handling and focus restoration. Navigation does not cover content or sit over the keyboard. Safe-area spacing is applied without a fixed bottom navigation bar. Desktop links remain directly accessible.
- Long balances, commitments, addresses and transaction details wrap inside min-width-zero containers. Mobile report tabs, transaction cards, evidence status rows, dashboard filters, add-wallet form and footer retain readable layouts.
- Integrated the approved mark in the header, mobile header, footer and scan loading state. Added outlined SVG and transparent PNG variants, browser/touch/profile icons and Open Graph/Twitter metadata. [Brand package and reproduction guide](brand/README.md).
- Added lightweight press/hover feedback, natural menu disclosure and an indeterminate scan-progress bar. No progress percentage, provider result or receipt confirmation is fabricated. Reduced-motion rules disable animations and transitions. Existing skeletons and cancellable requests remain.

## Responsive and visual verification

The reproducible collector is `web/scripts/audit-responsive.mjs`. It uses clearly labeled UI fixtures rather than actual live assessments. The stress report includes an unusually long exact decimal balance and complete transaction addresses. Provider errors, missing coverage and receipt pending states remain explicit.

Widths: **320, 360, 375, 390, 414, 428, 480, 768, 1024, 1440 and 1920px**. States cover landing, scanner, optional transfer context, How It Works, examples, footer, risk report, Ask AI response, receipt tools, transaction history/token tools, saved-wallet dashboard, add-wallet form, empty dashboard, scan history, empty history, invalid address, loading and provider failure. Mobile menu is additionally reviewed where available.

Screenshots at **360, 390, 428, 768 and 1440px** are intentionally stored under ignored `.cache/brand-mobile/{before,after}/`. The raw per-state dimensions, undersized labels/targets, overflow checks and runtime errors are in each directory's `audit.json`. The comparison gallery is `.cache/brand-mobile/comparison.html`. These files are local review artifacts, not an untracked source backlog or a claim of live blockchain intelligence.

Reproduce from `web` after serving the relevant build:

```powershell
$env:AUDIT_PHASE='after'
$env:AUDIT_URL='http://127.0.0.1:4173'
node scripts/audit-responsive.mjs
```

The before-build snapshot is retained locally. `before` screenshots represent the previous design; `after` captures represent the refined candidate. Captures and automated layout assertions do not replace manual screen-reader or physical-device checks. Final counts and engine results are recorded in the validation section below.

The completed run produced **90 before screenshots and 94 after screenshots**. It checked 198 before layout states and 206 after states (including the new menu), across the eleven widths. The after run reported zero document overflow, zero sampled labels below 12px, zero sampled controls below 44px and zero page runtime errors. Both designs passed document overflow checks; the important baseline defects were readability and target size. [Compact results](brand-mobile-responsive-summary.json). The reviewed local comparison gallery and all individual captures remain in the ignored cache rather than inflating Git history.

## Performance investigation

Historical evidence measured median LCP 2884ms at `d210ec2` and 4920ms at the previous readiness revision. Those observations used the same nominal viewport, CPU/network settings and Edge version but came from different sessions. They do not establish a controlled regression magnitude.

Both source revisions were rebuilt with the current installed toolchain and served by the same local static server without compression, on separate ports. Three fresh browser contexts per revision were measured in alternating order: 390×1000, 4× CPU throttle, 150ms latency, 1.6Mbps down / 750kbps up, disabled HTTP cache and reduced motion. External Google font URLs are blocked for historical parity; actual fonts are self-hosted. No other browser benchmark was intentionally running concurrently. A collector race allowing null LCP was fixed by waiting for the first observed paint; null samples are not scored as fast results.

The first valid reproduction produced 3088ms submitted / 3516ms pre-refinement medians. The final three-way comparison produced **1748ms submitted / 1804ms pre-refinement / 1412ms refined**. This variation demonstrates why a historical 2884→4920 claim cannot be attributed entirely to source changes. Raw traces, resource timings, all samples and settings are retained in [reproduction evidence](brand-mobile-performance-reproduction.json) and [final comparison](brand-mobile-performance.json). These are custom lab results, not Lighthouse or field Core Web Vitals.

The previous change embedded the entire 28KB stylesheet into initial HTML, increasing HTML from about 17KB to 45KB; it removed a CSS request but sacrificed independent caching and parallel delivery. The refinement restores the external stylesheet and explicitly preloads both existing local fonts. It also replaces the old 9522-byte favicon with a 218-byte SVG; brand PNGs and sharing images stay outside the paint path. CSS and React bootstrap grow modestly to support readable controls and navigation; no new runtime dependency is added. The measured improvement belongs to the combined candidate, not a claimed isolated attribution to one optimization.

Final sampled CLS was **0**. The refined build's sampled input interactions were **72–96ms**, below 200ms in that small EventTiming sample. This is **not a field INP measurement**. The 1.412-second LCP median meets the 2.5-second lab target in this session; physical low-end Android and field metrics remain unverified. Source-provider latency, AI availability and real serverless performance were not benchmarked by the UI fixture collector.

## Physical-device and assistive-technology checklist

Use an affordable Android phone with native Chrome and an iPhone with native Safari. Record model, OS/browser version, network and exact deployed revision. Try cold/warm loads on mobile data, portrait/landscape, enlarged text and 200% zoom. Check safe-area edges, paste/copy, input focus, keyboard opening/dismissal, scanner access, menu Escape where a keyboard exists, touch targets and every core state listed above. Verify no bottom overlays cover form controls. Recheck icon cropping and social preview caching only after an approved deployment.

Use TalkBack and VoiceOver: confirm product/navigation names, form labels, current network, invalid-input messages, scan status, unavailable coverage, receipt pending/failed/confirmed distinctions, copy announcements and menu expanded/current state. Keyboard through the full application with reduced motion on and off; confirm skip link, visible focus and return focus after closing navigation. Automated axe checks are partial evidence, not screen-reader certification. No physical Android/iPhone or native Safari test is claimed here.

## Release boundaries

All existing deterministic provider/security, rate-limit, AI fallback, storage and receipt tests must pass. The app still has the previously documented data-coverage and deployed-receipt lifecycle limits; visual changes do not upgrade their security claims. Deploying this approved identity still requires explicit deployment approval and competition eligibility confirmation. No paid service, blockchain write or change to production was performed.

## Validation and compatibility results

`npm run check` passed: formatting, ESLint, **77 web tests**, production client/SSR build and client-secret checks. Contract tests (**17**) and TypeScript checks passed; the simulator's **six tests** passed. **25 browser test cases** passed in installed Chrome 157; Edge 158 passed the original 24 plus the added accessibility case. These are **125 distinct automated tests**, with browser cases exercised on both installed Chromium-family browsers. No tests were skipped to obtain this result. The known upstream Clarinet/Vitest deprecation warning remains visible.

Additional smoke checks passed in Chrome 157, Edge 158, Firefox 159, WebKit 27.2, Chrome with Pixel 5 emulation and WebKit with iPhone 13 emulation. Their scope is production hydration, Bitcoin address validation, scan-control enablement, dashboard navigation, overflow and browser runtime errors; this does not imply a complete 25-case E2E run on Firefox/WebKit. [Exact engine evidence](brand-mobile-browsers.json). Native Safari and physical Android/iPhone testing remain manual.

Automated axe WCAG A/AA checks passed in the tested homepage/report, mobile dashboard, add-wallet error, receipt and chat states. Keyboard checks cover the skip link, menu Escape/current-state behavior and route focus. Reduced-motion checks and all eleven viewport regressions passed. Screen-reader behavior, meaningful contrast beyond tested rules and physical keyboard/safe-area interactions still require the manual checklist above; no accessibility certification is claimed.

Implementation and approved assets: [5f94417](https://github.com/jotel-dev/txguard/commit/5f94417). Review continues in [draft PR #7](https://github.com/jotel-dev/txguard/pull/7); final documentation and CI must be read at its latest head. No merge or deployment is authorized by these passing checks.

[Implementation CI](https://github.com/jotel-dev/txguard/actions/runs/45431336926) passed. The submitted `main` branch remained at `d210ec2` when remote synchronization was verified. The approved SVG/PNG assets and all source changes are versioned; cached screenshots, extracted benchmark builds and local servers are development artifacts.
