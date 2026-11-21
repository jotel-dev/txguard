# Verification and release handoff

Date: November 21, 2026, Africa/Lagos. Branch: `feat/txguard-2-reliability`. No production deployment, merge, contract publication or paid mainnet transaction was performed. Treat this as a locally verified release candidate, not a claim of completed production rollout.

## Implementation outcome

The existing React/Vite/Vercel application and five provider integrations remain. The false-safe path, AI dependence, automatic mainnet prompts, fabricated dashboard/transaction statistics, unvalidated API inputs and misleading persistence claims were removed. A single responsive scan/report/dashboard flow preserves valid saved addresses, contextual explanation, actual history and speech. The existing Clarity contract's logic/ABI is unchanged; LF normalization and expanded tests make local validation reproducible.

The old 70/30 formula is replaced by the documented [evidence policy](risk-policy.md). Partial or unavailable security coverage is distinct from a negative result. Serious indicators cannot be diluted by normal history, and duplicates cannot inflate the index. Scores are severity policy points, not a probability or calibrated accuracy measure.

## Tests and checks

The suites below pass locally. Read them alongside the checked-in tests and GitHub CI for the latest commit:

| Suite | Coverage |
| --- | --- |
| Web unit/API/security/storage | 52 tests: five-chain checksums, SegWit/Taproot, exact units, scoring/duplicates/conflicting context, missing data, provider schemas/outages, response-size limits, request policy, rate limits, prompt injection, Groq focus/fallback/cache, receipt finality, device migration and storage denial |
| Browser E2E | 14 tests: unmocked local API imports/method validation; complete scan/history/chat/receipt/save/reload/refresh journey; API recovery; cancellation of overlapping scans; invalid input; explicit fixtures; all seven widths; keyboard/reduced motion; axe WCAG A/AA checks |
| Clarity | 11 tests: original registry tests plus score boundaries, failed-write atomicity, permissionless duplicates, empty inputs, exact string bounds and oversized rejection |
| Local mock simulator | 6 tests: deterministic policy, rapid-transfer boundary, numeric validity, fund reservation/overspend, settlement/refund and labeled/size-limited local API |

Web lint and production build pass. Browser tests use installed Edge/Chromium 158 on Windows; Google Fonts are blocked in deterministic tests. No horizontal overflow was observed at 320, 375, 390, 428, 768, 1024 or 1440px. Axe reported no violations in the tested homepage and report states; this is not a universal accessibility certification. Safari, Firefox and physical affordable Android testing remain manual follow-up.

An important runtime issue was reproduced separately: dynamic API imports in Vite's generated config resolved relative to its temporary directory. An absolute file URL now resolves the allowlisted handlers. The new unmocked browser route test catches this failure, which API mocks alone could miss.

## Genuine provider and browser verification

Raw evidence: [live-verification.json](live-verification.json), [live-flow-verification.json](live-flow-verification.json).

- Existing public application returned HTTP 200. It is the previous deployment, not proof this branch is deployed.
- Live local browser scan of the sourced historical Ethereum address returned High risk (95) from actual GoPlus indicators. Its measured end-to-report API/browser wait was 2,755 ms. Etherscan activity was explicitly unavailable without a key.
- Live scan APIs returned HTTP 200 on all five chains. The no-scored-indicator EVM example returned low observed risk with available GoPlus fields and missing Etherscan data. Bitcoin, Solana and Stacks returned actual balances and null security scores with insufficient-data categories. The six genuine scan observations are a small sample, not a production error-rate estimate.
- Measured individual local scan API times in that sample: Ethereum 1,104 ms; BNB 547 ms; Bitcoin 1,039 ms; Solana 891 ms; Stacks 1,211 ms. These single observations include upstream/network conditions and are not an SLA.
- Real recent history was retrieved for Bitcoin (25 observations), Stacks (20) and Solana (6 signatures). Sampling/decode limits remain explicit. EVM balance/history adapters pass mocked tests but remain unverified live without Etherscan credentials and plan support.
- Deployed registry interface verified compatible. Deployed source matches local source ignoring comments and whitespace; retrieved source SHA-256: `e193cb87747e527f42e4f51861bf79b264030f79c8b967a458066400ee4535ca`.
- Existing receipt `0x5b650d7c34b8784ec2f144244173cc2e23a1e69f1e41cd332e02a0f6dfd6c082` was verified as a successful canonical anchored `log-scan` call at height 8495105. No transaction was submitted. This old public assertion does not establish its score's accuracy or match the current report.
- Live Groq inference was not verified without a key. Mocked structured responses, rate limits, malformed responses, injection attempts, fallback and deduplication were tested. Model output only selects approved explanatory focus; it cannot create factual prose or change a score.

## Dependency and security evidence

Initial web audit: 35 advisories (including one critical and 23 high). Compatible fixes and pinning Stacks Connect 8.1.9 removed the vulnerable optional wallet tree without loading a wallet SDK in the scan UI. Simulator's initial audit included high/critical advisories; compatible updates and a patched `qs` override resolved them. Updated Clarinet test tooling also passed an audit.

Final saved npm audits report zero known advisories for [web](web-audit-final.json), [contracts tooling](contracts-audit-final.json) and [simulator](simulator-audit-final.json). This is a point-in-time dependency result, not proof of complete security. The audit JSON is UTF-8 and contains no credentials.

Server-only keys have no Vite-prefixed fallback. Browser components do not import the server provider/AI modules. Payloads, HTTP methods, request origins, fixed provider URLs, response schemas, deadlines and body/response sizes are constrained. Errors do not expose upstream exceptions or stack traces. Local report hashes are neither signatures nor onchain records.

## Performance evidence

Raw files: [baseline-bundle.json](baseline-bundle.json), [performance.json](performance.json). The baseline build produced approximately 1.476 MB of JavaScript across all chunks and a 401.9 KB entry chunk (127.4 KB gzip). The revamped build produces approximately 277 KB total and a 258 KB entry chunk (about 83 KB gzip): about 81% less total emitted JavaScript and 36% less entry JavaScript. Dashboard, report and receipt tools load separately; the wallet SDK no longer loads during scanning. Unused decorative assets are not requested.

The final production-preview lab run measured desktop LCP 0.932 s / load 0.358 s and mobile LCP 5.012 s / load 1.465 s, with CLS 0 on both and roughly 2.8 MB observed JS heap. Mobile emulation used 4x CPU slowdown, 150 ms latency and 1.6 Mbps downlink; fonts were blocked for deterministic fallback rendering. Metrics were collected from the initial viewport before screenshots could trigger additional painting. These are local single-run lab observations, not field Core Web Vitals or Lighthouse scores. INP, production API error rates and physical-device memory were not measured. The slow-network mobile LCP still needs attention before a strong production performance claim.

Provider checks are bounded and independent scan collectors run concurrently. Scans cache 60 seconds, history 30 seconds and successful identical AI explanations 120 seconds. In-flight deduplication is bounded. No automatic infinite retries or duplicate AI requests during scanning remain.

## Remaining issues and exact next actions

| Priority | Remaining action | Release impact |
| --- | --- | --- |
| High before broad public traffic | Configure distributed edge throttling and cost limits; warm-instance buckets are not globally coordinated | Production traffic gate, not a claim of complete abuse resistance |
| Medium | Configure an approved Etherscan key/plan and validate ETH/BNB native + token histories live | Those activity fields currently show unavailable; security scans continue |
| Medium | Approve and deploy the reviewed commit, then run the public-domain smoke checklist | This revamp is not yet the public deployment |
| Medium | Collect field/mobile performance data and improve slow-network LCP; test physical Android and other browsers | Local browser coverage is limited |
| Low/optional | Configure/test live Groq and review optional TTS privacy/reliability | Deterministic explanations and native speech remain available |
| Submission | Review accurate assets/limitations, verify final public revision, submit by the owner-supplied deadline | November 22, 2026, 11:59 PM Nigeria time |

Not implemented: non-EVM security intelligence, complete historical indexing, comprehensive sanctions/ownership checks, approval/honeypot execution analysis, transfers/payment processing, new paid mainnet receipts, Telegram/community reporting or dark mode. Durable bug storage is not configured; the application links users to GitHub issues rather than falsely claiming persistence.

Automatic approval review rejected adding fee-bearing mainnet receipt creation because it was outside the retained authorized scope. Read-only verification is the completed safer alternative. A future receipt writer requires separate approval and a review of public data exposure, network fees, wallet signing and finality.
