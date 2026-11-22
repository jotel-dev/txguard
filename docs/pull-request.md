Recipient checks previously risked presenting incomplete provider coverage as reassuring results, while client-side credentials, fabricated dashboard/history data and process-only quotas made a public launch unreliable. This change delivers the TxGuard 2.0 recipient workflow with explicit evidence coverage, actual available ledger history and fail-closed shared API protection, preserving the existing design, saved valid addresses and deployed Stacks ABI.

## Resulting behavior

- Shared checksums validate five mainnet address formats. Deterministic categories use retrieved indicators; insufficient intelligence produces a null score. Unavailable activity remains distinct from confirmed empty history.
- Server-only Etherscan V2 adapters support Ethereum/BNB IDs 1/56, exact amounts, token decimals, bounded caching and safe key/plan/rate-limit errors. Bitcoin, Solana and Stacks retain genuine read-only adapters with explicit decoding limits.
- Atomic Redis quotas cover all six APIs per client, endpoint and app, using HMAC client identifiers. Missing credentials or Redis outages return 503 before provider/AI work in production/previews, with no memory fallback.
- Saved-wallet refresh/history, downloadable reports, grounded optional explanations, speech, labeled examples and read-only Stacks receipt verification share one responsive flow. No automatic signing or mainnet write path is added.
- Build-time public HTML, critical CSS, licensed local fonts and delayed interactive bootstrap improve the cold mobile paint path. Pre-hydration fields are disabled; failed bundle downloads offer reload recovery.
- CI checks formatting, lint, build/client secret boundaries, strict contract TypeScript, regression/browser tests and audits. Deployment/environment/hackathon instructions disclose actual coverage.

## Validation

101 local automated tests pass: 67 web unit/API/security, 17 Playwright E2E, 11 Clarinet simnet and six simulator tests. Additional Firefox/WebKit/Android-emulation smoke checks pass. Seven widths, keyboard/reduced motion and automated axe rules are covered. All three dependency audits report zero vulnerabilities. Project typecheck/build/format/lint checks pass; the upstream Clarinet Vitest deprecation warning remains visible.

Read-only public probes confirm available provider responses, the deployed registry ABI, matching source and an existing anchored successful receipt. Bitcoin history timed out in the final probe. Redis/Etherscan mocks cover concurrency, failures, cooldowns, precision and credential boundaries; no authenticated live Redis/Etherscan result is claimed.

Cold mobile median LCP improves **4.680s → 2.884s** across three identically throttled runs, CLS zero. The 2.5s target remains unmet. The 3.18KB paint-critical loader defers essential bootstrap work; total emitted JavaScript is ~280KB rather than ~277KB. This is custom lab evidence, not field CWV or a Lighthouse score.

## Draft / launch requirements

Keep this PR draft pending review and live configuration. Configure an existing Redis REST URL/write token plus `RATE_LIMIT_HMAC_SECRET`, and an Etherscan V2 key/plan supporting the required ETH/BNB endpoints. Optional Groq inference also remains unverified. Production APIs deliberately fail closed until shared protection is configured.

Existing branch automation creates protected Vercel previews; the login page and protected API do not establish an app smoke-test pass. Production is unchanged. Vercel settings could not be inspected with the current invalid CLI token. Physical Android/native Safari, actual cross-instance limits, deployment headers/APIs and field performance remain to verify.

Do not merge, promote/deploy production, overwrite environments, provision paid services or submit mainnet transactions without explicit owner approval. See [final report](docs/final-release-report.md), [environment setup](docs/production-environment.md), [deployment checklist](docs/deployment-checklist.md), [submission copy](docs/hackathon-submission.md) and the current head's CI checks.
