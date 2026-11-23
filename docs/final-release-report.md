# Final stabilization and launch handoff

Historical handoff. For the November 23 post-submission audit, current production observations, isolated development changes and remaining release gates, see [readiness report](readiness-report.md). PR #6 has since merged; statements below about the old production rollout are historical.

Branch: `feat/txguard-2-reliability`. Security stage: `fc4022e`. Final source and CI status are identified by the PR's current head commit. Verification artifacts retain their actual timestamps; they are observations, not continuing availability guarantees. Production still serves the previous release.

## Completed implementation

All six APIs now await atomic shared Redis quotas for the client, endpoint and application before expensive work. HMAC identifiers keep raw client IPs out of Redis keys; Vercel-owned forwarding headers are trusted only on Vercel. Production and previews return a recoverable 503 when shared protection is unconfigured or unavailable, without a process-memory fallback. Redis calls reject redirects, validate the endpoint, time out after two seconds and cap streamed responses at 4 KB. Fixed windows and global ceilings are explained in [environment setup](production-environment.md).

Etherscan V2 uses server-only credentials and chain IDs 1/56. Exact integer conversion is preserved; missing token decimals remain unknown. Missing/invalid keys, unsupported plans, malformed replies, HTTP 429 and provider `NOTOK` rate limits produce safe unavailable states and bounded cooldowns. Unavailable history cannot be mistaken for confirmed empty history. No authenticated Redis or Etherscan result is claimed: automated tests mock these services, and no credentials were supplied.

Public homepage HTML is rendered at build time without user data or provider calls. Critical CSS and locally hosted, licensed Manrope/Space Grotesk fonts remove the external font dependency. A small loader starts React after an initial paint opportunity. Fields stay disabled until hydration; download failure offers reload recovery. Saved wallets, direct hash navigation and the established visual design remain covered by browser tests. The six local/Vercel API handlers remain the same source of behavior.

Formatting and production-build invariant checks now run in CI, alongside lint, automated tests, dependency audits and strict contract TypeScript checks. Environment files are ignored except `.env.example`. The build checker scans public HTML and every client JavaScript chunk for server credential references and configured secret values. No contract logic/ABI changes, mainnet transactions or paid infrastructure were introduced.

## Verification

| Check | Result |
| --- | --- |
| Web formatting, ESLint, production build and client secret-boundary checks | Passed |
| Web unit/API/security regression tests | 67 passed |
| Deterministic Playwright E2E | 17 passed, zero skipped/flaky/failing |
| Viewports | 320, 375, 390, 428, 768, 1024, 1440px; no horizontal overflow |
| Accessibility | Tested homepage/report axe WCAG A/AA rules, keyboard skip link and reduced motion pass; not a complete manual accessibility audit |
| Contract TypeScript / Clarinet simnet | Passed / 11 tests passed |
| Synthetic simulator | Six tests passed |
| npm audits: web, contracts, simulator | Zero reported vulnerabilities in each saved snapshot |
| Additional engines | Firefox 159, WebKit 27.2 and Chromium Android emulation passed; no native Safari/physical-device claim |

The total is **101 automated unit/integration/E2E tests**, plus the three supplemental engine smoke checks. The Clarinet SDK emits a Vitest environment `transformMode` deprecation warning; its tests and project typecheck pass. This upstream warning is not suppressed. Remote CI is checked on the pushed commit and remains visible in the PR.

Evidence: [browser smoke](browser-verification.json), [web audit](final-web-audit.json), [contract audit](final-contracts-audit.json), [simulator audit](final-simulator-audit.json), and [public provider checks](final-live-verification.json). Public checks returned Bitcoin/Solana/Stacks balances, Ethereum/BNB GoPlus responses, Solana/Stacks recent activity and registry verification. Bitcoin history timed out after the bounded seven-second request; it is recorded as unavailable. EVM activity remains unavailable without a key.

The deployed registry interface remains compatible and its source matches local code ignoring comments/whitespace. The existing successful canonical anchored receipt `0x5b650d7c34b8784ec2f144244173cc2e23a1e69f1e41cd332e02a0f6dfd6c082` was verified at height 8495105. This is read-only verification of a public assertion, not proof that its recorded risk score is correct or bound to a current report.

## Performance measurement

Three cold production-preview runs per revision used a 390×1000 viewport, 4× CPU slowdown, 150ms latency, 1.6Mbps download/750kbps upload and disabled HTTP cache. Google Fonts requests were blocked identically for baseline and final runs; the final app uses local fonts. Measurements precede screenshots. These are custom lab measurements, not Lighthouse scores or field Core Web Vitals.

| Metric | Before (`2356639`) | Final |
| --- | --- | --- |
| LCP samples (ms) | 4680, 4460, 5440 | 3324, 2708, 2884 |
| Median LCP | 4680ms | 2884ms, 38.4% improvement |
| CLS | 0 | 0 in all three runs |
| Paint-critical entry JavaScript (raw) | ~258KB | 3.18KB loader |
| Total emitted client JavaScript (raw) | ~277KB | ~280KB |

The interactive application still downloads/evaluates its React/bootstrap chunks after the initial paint opportunity. Splitting improves the critical path; it does not eliminate their cost. **The <=2.5-second mobile LCP target is not met.** The heading remains the largest paint, and CPU long tasks remain in the traces. See [before](final-performance-before.json), [after](final-performance-after.json) and `web/scripts/measure-performance.mjs` for reproducible evidence. Retain this limitation in hackathon claims and measure actual deployed/field behavior before describing production performance.

## Configuration and approval boundary

Configure the three required shared-protection variables and the Etherscan key privately using [the exact Vercel instructions](production-environment.md). Groq is optional. No secrets were added to frontend configuration, chat or source control. Missing protection produces a clear 503; missing Etherscan produces honest activity limitations, while independent security intelligence remains usable after protection is configured.

The available Vercel CLI session has an invalid token, so project settings/environment values were not verified. The existing automatic preview redirects to Vercel login and its API returns protected-deployment 401. Its login page's HTTP 200 is not an application smoke-test pass. The [deployment snapshot](existing-deployment-check.json) records this. Existing GitHub automation may create further previews on authorized pushes; no explicit deploy or production promotion command was issued. The public production app remains the old release.

Remaining launch work: authenticated Etherscan/Redis verification, preview access and public API/header checks, physical Android/native Safari testing, field performance and approval to merge/deploy. Non-EVM security intelligence, comprehensive sanctions screening, execution simulation, ownership verification and honeypot/approval checks remain outside implemented coverage. Follow the [deployment checklist](deployment-checklist.md) after explicit approval. No merge, mainnet write or production deployment is authorized by this handoff.
