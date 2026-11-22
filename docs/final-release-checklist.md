# Final stabilization blockers

Starting revision: `2356639` on `feat/txguard-2-reliability`. Working tree was clean. This phase preserves the existing design, integrations, registry ABI and user data.

- [x] Implement atomic shared client/endpoint/application quotas for all six APIs. Missing credentials/outages fail closed in production, with no memory fallback. Concurrency, privacy, spoofing and failure behavior are mocked in regression tests.
- [x] Implement and mock Etherscan V2 chain IDs 1/56, exact native/token amounts, credential/plan/rate-limit failures and bounded cooldowns. Keys stay server-only. Setup is documented in `.env.example` and [production environment](production-environment.md).
- [x] Measure before/after under the same mobile throttling. Build-time public HTML, critical CSS and local fonts improve three-run median LCP from 4.680s to 2.884s; CLS is zero. **The <=2.5s target is not reached.**
- [x] Pass formatting/lint, 67 unit/API tests, 17 E2E tests, contract typecheck/11 simnet tests and six simulator tests. All three dependency audits report zero vulnerabilities. Additional Firefox/WebKit/Android-emulation smoke checks pass. Public registry ABI/source/anchored receipt are rechecked; Bitcoin history times out in the final probe.
- [x] Inspect available deployment evidence read-only. Vercel CLI authentication is invalid; settings cannot be verified. Existing automatic preview redirects to Vercel login; its API is protected. Production remains the previous release.
- [x] Prepare accurate submission, deployment, environment and PR documentation. Follow the PR's exact-head GitHub checks for remote verification; local results are in the [release report](final-release-report.md).
- [x] Preserve the approval boundary: no merge, explicit deployment/promotion, mainnet writes, paid infrastructure, contract logic changes or destructive operations.

## Remaining launch requirements

- [ ] Configure an existing Redis REST URL/write token and HMAC secret privately; verify actual deployed multi-instance quotas, 429s and outage behavior.
- [ ] Configure an Etherscan V2 key with compatible chain/endpoint access; verify genuine ETH/BNB balances and histories against explorers. Optional Groq inference also needs separate authenticated verification.
- [ ] Obtain authorized preview access and verify the exact release on Vercel, including headers and serverless APIs. Existing automated previews do not establish production readiness.
- [ ] Measure field performance and inspect physical Android/native Safari. Mobile lab LCP remains above target.
- [ ] Obtain explicit merge and production deployment approval, then complete the [deployment checklist](deployment-checklist.md).
