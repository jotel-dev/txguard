# Production deployment checklist

No explicit deployment, production promotion, environment overwrite, contract upgrade, merge or paid transaction was performed. Existing GitHub automation creates protected Vercel previews on authorized branch pushes. Complete this checklist against the exact approved commit. See [final release results](final-release-report.md) and [exact environment setup](production-environment.md).

## Before approval

- [ ] Review the feature branch and [final release report](final-release-report.md). The old public deployment is not this revamp.
- [ ] Confirm GitHub CI passes for the exact branch commit; review browser artifacts if a runner fails.
- [ ] Vercel Root Directory: `web`; Framework: Vite; install: `npm ci`; build: `npm run build`; output: `dist`.
- [ ] Use Node `24.x`, declared in `web/package.json`. Vercel supports it for [builds and functions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions).
- [ ] Check `web/vercel.json`: six top-level serverless handlers, 30-second maximum function duration, SPA fallback excluding API/assets and security headers. Confirm this matches the project's enabled Vercel plan/runtime.
- [ ] Add `ETHERSCAN_API_KEY` only with permission, using a plan supporting chain IDs 1 and 56. Verify normal transactions, token events and balances independently on both chains. Without it, scans still work with available security intelligence and explicit missing activity.
- [ ] Optional: add server-only `GROQ_API_KEY` with permission and test one explanation. If omitted or rate-limited, deterministic explanation remains available.
- [ ] If used, `APP_ORIGIN` must be the exact deployed origin, without a path. Browser API calls are same-origin; do not add wildcard CORS. Do not expose keys under `VITE_` names.
- [ ] Configure `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` (write token) and `RATE_LIMIT_HMAC_SECRET` using an existing approved Redis service. A complete `KV_REST_API_URL`/`KV_REST_API_TOKEN` pair is supported instead. Shared client/endpoint/app quotas cover all six APIs. Missing protection fails closed with 503 in production and previews; there is no in-memory production fallback. Verify actual cross-instance behavior and choose appropriate global ceilings; mocks do not establish live readiness. Consider edge firewall controls and provider usage/spend alerts separately.
- [ ] Decide whether optional external TTS is appropriate for production; it sends summary chunks to Google. Native device speech remains the first path.
- [ ] Verify no credentials in the staged diff, logs, source maps or built assets. Do not upload `.env` files.
- [ ] Retain a previous deployment identifier/rollback reference. Avoid mixing this frontend with older API handlers.
- [ ] Obtain explicit approval for deploying the reviewed commit.

## After an approved deployment

- [ ] Verify HTTPS, title, favicon, all navigation, SPA direct links, responsive layout and API status codes on the actual public URL.
- [ ] Verify the security headers returned by the deployment, including CSP. Browser connections should use same-origin API endpoints; no upstream credentials should appear in browser requests.
- [ ] Run one genuine low-observed-risk/limited-coverage example and the sourced historical address. Do not assume either category stays the same indefinitely.
- [ ] Reject malformed EVM, Bitcoin, Solana and Stacks inputs without upstream requests.
- [ ] Simulate upstream outage in a controlled test; verify null score for insufficient security coverage, no fabricated safe score, and recoverable history errors.
- [ ] Save a wallet, reload, refresh, inspect its timestamp, and clear history. Check storage-denied behavior.
- [ ] Verify an existing Stacks receipt without signing or spending. Check ABI/source and current anchoring/canonical flags again.
- [ ] Verify rate limits across multiple function instances, not only local tests. Monitor provider errors, latency and spend.
- [ ] Repeat the 320–1440px mobile checks and a physical Android Chrome/native Safari check. Local Chromium/Firefox/WebKit and Android emulation pass, but do not establish physical-device or native Safari compatibility.
- [ ] Measure actual field Core Web Vitals and production scan latency/error rate. Final cold mobile lab median LCP is 2.884 seconds, improved from 4.680 seconds; the 2.5-second target remains unmet. See [three-run evidence](final-performance-after.json). Lab observations are not a production guarantee.
- [ ] Replace submission links/screenshots only after verifying the deployed revision. Submit before the owner-supplied deadline: November 22, 2026, 11:59 PM Africa/Lagos (10:59 PM UTC).

## Explicitly excluded

Creating or altering real payments; publishing/upgrading contracts; automatic wallet signing; mainnet receipt creation; production environment replacement; merging. These require separate explicit approval. Automatic approval review rejected adding a fee-bearing mainnet receipt path; read-only receipt verification is the completed safer scope.
