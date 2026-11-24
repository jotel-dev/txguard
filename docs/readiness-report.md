# Post-submission engineering and release readiness

Audit date: November 23, 2026, Africa/Lagos. Development branch: `feat/txguard-demo-readiness`. Submitted source baseline: `d210ec2fcfa535cd8b187d28d66f1dd504255690`. Production was not changed. No merge, deployment, contract publication, payment, paid infrastructure or mainnet transaction was performed.

## Repository and production audit

Remote `main` and `feat/txguard-2-reliability` both pointed to the baseline at audit start. PR #6 is closed and merged. Baseline CI succeeded: https://github.com/jotel-dev/txguard/actions/runs/45021096755. This supersedes historical documents saying the revamp was not on main. The untracked `media/` directory predates this work and is excluded from commits.

Production returns HTTP 200, prerendered product content, CSP, HSTS, nosniff, frame denial and referrer/permissions policy. A live Ethereum scan returned actual native balance and an available Etherscan source; history returned 30 recent normalized observations. BNB security intelligence was available, but production Etherscan balance and history were rejected by the configured plan. This establishes observed credential usability for Ethereum, without revealing or inspecting the key. Vercel CLI has no authenticated session, so environment variable inventory and exact deployment-to-commit metadata remain unverified. Matching behavior/headers alone do not prove the deployed commit.

No authoritative competition rule permitting post-submission modifications was found in the public search. Development is isolated; the submitted deployment must remain untouched until organizer eligibility and explicit owner approval are confirmed. There is no inferred approval from the already merged PR.

## Prioritized implementation checklist

| Priority | Status | Work / remaining gate |
| --- | --- | --- |
| Critical | Preserved | No submitted deployment changes; no fee-paying or contract deployment actions. Confirm competition eligibility before release. |
| High | Fixed locally | Stacks transaction history now requires canonical anchored positive-height evidence before showing Confirmed. |
| High | Prepared locally | Salted deterministic receipt packages, offline verification and a separate privacy-focused simnet contract. New deployed registry and wallet submission/fee/finality integration remain release gates. |
| High | Observed / partial | Production quotas return 429 with Retry-After; mock tests exercise atomic concurrent/global/AI/expiry/outage behavior. Real cross-instance and Redis-failure drills need an isolated authorized preview. |
| High | Partial | Production BNB plan restriction reproduced; free native RPC fallback implemented and live-probed locally. Full indexed BNB history remains unavailable on the configured plan. |
| Medium | Implemented locally | On-demand standard ERC-20 balance/decimals reads on Ethereum/BNB via fixed RPC endpoints. No automatic token discovery, token legitimacy or spendability guarantee. |
| Medium | Implemented locally | Privacy-conscious provider failure logs, warm-instance counters and rate-protected minimal health route. Durable operational dashboard/alerting is not configured. |
| Medium | Measured separately | Mobile LCP target remains a release concern; CSS request elimination implemented. See performance artifacts and validation addendum. INP needs field/user-interaction measurement. |
| Medium | Manual outstanding | Physical affordable Android/native Safari validation, authenticated preview access and deployed revision provenance. |
| Low | Prepared | Eight-slide content, live/fallback script, technical Q&A, manual device checklist and release procedure. Optional product expansions remain roadmap items. |

## Five-chain capability matrix

All addresses are validated for their supported mainnet formats/checksums. All providers use deadlines and bounded response sizes; errors remain unavailable rather than invented empty data. These are adapter capabilities, not equal detection coverage.

| Network | Native balance | Tokens | Recent history | Security intelligence | Evidence / limitations |
| --- | --- | --- | --- | --- | --- |
| Ethereum / 1 | Live production Etherscan read observed | Transfer events supported; standard contract balance/decimals tool added locally | Live production sample, native and token events | GoPlus; deterministic scoring | Internal calls, complete history, pending mempool enumeration and approvals not indexed. |
| BNB / 56 | Production unavailable on plan; public-RPC fallback live-probed in development | Standard contract balance/decimals tool locally; indexed transfer events need plan access | Production returned 503 due plan | GoPlus | Free native RPC cannot supply arbitrary indexed address history. |
| Bitcoin mainnet | Confirmed UTXO balance live-probed | No token support | Live recent sample; multi-input/output attribution disclosed | Unavailable | Balance/history are not scam screening. Recent mempool observations do not enumerate every pending transaction. |
| Solana mainnet | Finalized SOL live-probed | Selected parsed SPL amounts; no portfolio enumeration | Six signatures, details best effort | Unavailable | Missing decimals/unchecked amounts remain unknown; multiple/inner transfers need explorer inspection. |
| Stacks mainnet | STX live-probed | No fungible-token balance tool | Recent Hiro history live-probed | Unavailable | Contract calls do not imply STX transfers. Receipt confirmation and address-security assessment are distinct. |

The new token tool reads `eth_chainId`, `balanceOf(address)` and `decimals()` using fixed server URLs, valid addresses and exact integers. Malformed/reverting/nonstandard contracts, wrong chain and missing decimals are rejected. Values reflect the RPC's latest state, not a single pinned historical block or independently cross-checked consensus. Supported decimals are 0–36. Native public-RPC fallback only applies to BNB missing configuration/unsupported plan; it does not silently replace invalid credentials or all provider errors.

Sources: [BNB's official public endpoints and disabled log support](https://docs.bnbchain.org/bnb-smart-chain/developers/json_rpc/json-rpc-endpoint/), [PublicNode](https://publicnode.com), [Etherscan supported chains](https://docs.etherscan.io/supported-chains), [Etherscan free-tier policy](https://kb.etherscan.com/whats-changing-in-the-free-api-tier-coverage-and-why). No paid plan was purchased. An indexed BNB provider with suitable permitted free access has not been verified; do not market the RPC balance fallback as completed history indexing.

## Security review and bug fixes

- **Stacks false finality fixed:** successful provider status alone previously permitted Confirmed history. Canonical flag, anchored flag and positive safe block height are now mandatory; unknown/reorged/unanchored results remain Unconfirmed. Regression test covers each boundary.
- **Receipt privacy gap addressed in local candidate:** old unsalted evidence hash is explicitly local and offers no secrecy guarantee. New packages use a fresh browser-generated secret 32-byte nonce, a domain separator and a versioned deterministic assessment schema including scan ID/time/policy/network/wallet/score/signal IDs/coverage. External prose is excluded. Report/nonce never go onchain in the candidate. Keep the downloaded package private.
- **Request and provider boundaries reviewed:** server-only secrets; fixed upstream hosts; no user-selected URL/redirect; method/origin/body validation; escaped React output; constrained explorer links; bounded caches; fail-closed distributed quotas; no signing/private-key capture. Public health does not disclose credentials, endpoints, wallet data or service configuration and does not trigger provider fan-out.
- **AI reviewed:** Groq selects only an approved explanatory focus; server-owned facts and deterministic scores cannot be changed by model prose. Existing malformed output/injection/fallback tests pass. Live Groq account availability remains unverified. Scanner remains independent of AI.
- **Dependency audits:** fresh web/contracts/simulator audit files each report zero known vulnerabilities. This is a snapshot, not a comprehensive security guarantee or independent audit.
- **Payment audit:** no real payment processor or server payment-verification path exists. Current product says free scans and requires no connected wallet; pay-as-you-go revenue claims are unsupported. Future paid API/team/monitoring work needs server-created invoices, asset/network/amount binding, confirmations, unique settlement IDs and replay prevention before public payment claims. No paywall was introduced.

Residual risks: centralized provider accuracy/freshness, limited non-EVM intelligence, public-RPC availability/quotas, incomplete history/mempool coverage, fixed-window bursts, wallet-address disclosure to providers, public submitter/timing correlation for future receipts, device-local persistence only and no field performance SLA. No new Critical finding was established by this review. That does not prove absence of vulnerabilities.

## Smart contract and receipt lifecycle report

Existing mainnet contract: `SP3QKY6WR398BJHPP23VKKEQXQ0T1H1HAQ1BKQFKM.registry`. Its `log-scan(chain,target,risk-score)` accepts public strings and score ≤100; callers are permissionless, empty strings and duplicate records are allowed. It neither authenticates TxGuard assessments nor stores a commitment. Encoding a hash as a fake target would change semantics and is deliberately avoided.

The live interface and a historical canonical anchored receipt were checked in `readiness-live-verification.json`. The fresh source-fetch timed out; historical normalized source equivalence remains in `final-live-verification.json`. Original 11 registry tests remain and document its limitations.

New `receipt-v2.clar` is a local candidate with `register(buff32)` and `get-receipt(submitter,commitment)`. It accepts exactly 32 nonzero bytes, uses `map-insert` to prevent same-submitter replay and requires direct calls (`tx-sender = contract-caller`). Another principal copying a commitment cannot occupy the victim's key. It stores only commitment, submitter key and registration height. No owner/admin or asset transfer is present. Six candidate tests cover registration/readback, duplicate atomicity, copying/impersonation, empty/truncated/zero input, oversized arguments and indirect-call rejection. The rule intentionally excludes contract-wallet forwarding; decide compatibility explicitly before deployment. Commitments still register arbitrary user assertions, not authenticated TxGuard endorsements.

The frontend can prepare a private package from a live report and export it. Independent offline check from `web`: `node scripts/verify-receipt.mjs <private-package.json>`. This validates package bytes only. Do not upload the package publicly, especially its nonce. Repeated preparation creates fresh randomized commitments; per-scan idempotency must be implemented in the future wallet writer.

**Not completed:** deployed commitment registration, wallet fee estimate/explicit signature, submission/rejection/insufficient-funds handling, durable pending-tx tracking, independent v2 onchain readback and finality polling. These cannot be represented as a working mainnet lifecycle. Before deployment: obtain explicit approval, select testnet contract/network, estimate current deploy/call fees without broadcasting, test supported wallets and fee/rejection/reorg paths, review CSP requirements, then request separate mainnet approval. No fixed STX cost is invented: cost depends on serialized size, execution and network fee conditions. Keep v1 records and verifier available; deploy v2 at a distinct approved identifier and never relabel old assertions as commitment receipts. No mainnet/testnet deployment plan was executed; only simnet auto-planning changed.

## Production configuration, monitoring and failure investigation

Follow `production-environment.md` for obtaining Etherscan keys, selecting preview/production scopes and storing server-only Redis/Groq variables. Never paste values into chat. Live Ethereum behavior establishes functioning explorer access; direct environment inventory remains unavailable. Redis is consistent with live quota behavior and the known fail-closed implementation, but the backing database/credentials and multiple-instance behavior were not directly inspected.

For failures: record UTC time, route, status and deployment revision without wallet/IP/prompt; check API error counts, `Retry-After` and structured `provider_failure` events. Logs contain only an allowlisted service name and duration. `operationalSnapshot()` is internal warm-instance request/failure/latency totals; it is not a durable aggregate or public endpoint. Transport/JSON success does not establish semantic provider success: provider NOTOK/schema errors still require route-level investigation. Check `/api/health` for API and shared-protection readiness only after approval to deploy this candidate; it does not certify upstream or AI availability. Production 503 before provider work means inspect private Redis configuration/connectivity first. Never log tokens or upstream response bodies. No paid monitoring added.

Real Redis evidence: 21 sequential invalid registry IDs generated 20 HTTP 400 validation errors and one 429 with 53-second Retry-After. These requests make no upstream provider calls and use the registry quota. Mock tests separately exercise two limiter instances sharing atomic counters, expiry, per-client/global/AI ceilings, outage/invalid credentials and fail-closed behavior. Cross-serverless-instance distribution, real Redis outage/credential revocation and global-limit saturation were intentionally not exercised on production. Use an isolated approved preview for those drills, not the submitted app.

## Validation, browser and performance handoff

Baseline: web 67 tests, contracts 11, simulator 6; web formatting/lint/build and contract typecheck passed. Updated test totals, browser outcomes, measured performance and CI are in the validation addendum below and linked raw artifacts. An initial sandbox browser target crash and server teardown hang occurred; passing reruns must be reported separately, not erased or described as a first-run success.

Physical Android/native Safari and field INP remain manual. `demo-day-package.md` contains exact steps, seven widths, touch/keyboard/clipboard/storage/failure cases and the eight-slide content. Existing fixtures remain visibly labeled. No security accuracy, revenue, partnership, traction or physical-device result is invented.

## Release and rollback checklist

1. Inspect the development diff and all remaining limitations; retain submitted baseline SHA and current production deployment identifier.
2. Verify all repository checks and pushed-commit CI. Review the new PR; never merge automatically.
3. Confirm organizer eligibility for post-submission deployment changes and obtain explicit owner merge/deploy approval. Vercel authentication is required to confirm exact deployed source and configuration privately.
4. Use an approved preview for new routes, live ERC-20 reads, Groq and Redis outage/expiry/cross-instance drills. Verify no secrets in public artifacts.
5. Test physical devices and measure comparable mobile performance; do not claim target compliance without evidence.
6. Approve contract work separately. The local candidate does not authorize publishing or sending a paid transaction.
7. After an approved release, smoke-test all five chains, source/coverage states, quota 429/503, AI fallback, history and legacy receipt verification; record exact commit/deployment IDs.
8. If error/latency rates regress, obtain approval to restore the previously recorded deployment. No destructive migration is required by this candidate; existing registry and device storage formats remain available.

Current decision: **development candidate with explicit release gates; not an assertion that every requested production feature is complete.**

## Validation addendum

The final source checks passed: `web/npm run check` (formatting, ESLint, **75 web tests**, client + SSR production build and client-secret boundary scan); contract `npm test` (**17 simnet tests**) and `npm run typecheck`; simulator `npm test` (**6 tests**); browser `npm run test:e2e` (**18 passed**, zero skipped). Total: **116 automated tests**, plus three supplemental engine smoke checks. The web application uses JavaScript rather than a configured TypeScript project; no nonexistent web typecheck is claimed. The contract tooling still reports its upstream Vitest `transformMode` deprecation warning.

The new browser regression downloads a real private package from the mocked live-report UI and verifies its digest offline, then checks token balance rendering. Existing E2E covers seven widths, cancellation, saved state, degraded providers, accessible labels/keyboard/reduced motion and tested axe rules. Firefox 159, WebKit 27.2 and Edge-based Android emulation smoke checks passed after rerunning outside the sandbox; no native Safari or physical Android result is claimed. The initial sandbox target crash/teardown hang is an execution limitation, not a hidden product pass.

Fresh read-only token probes in `readiness-evm-rpc.json` returned Ethereum contract decimals 6 and BNB contract decimals 18, exact token units and a BNB native balance. The sample public wallet and contract identifiers are included for reproducibility, not endorsement. Public RPC has no SLA and provider errors remain unavailable.

Artifacts: `readiness-live-verification.json`, `readiness-production-probes.json`, `readiness-production-rate-limit.json`, `readiness-evm-rpc.json`, `readiness-{web,contracts,simulator}-audit.json` and `browser-verification.json`. CI and commit links are recorded in the final handoff after the authorized feature-branch push.

### Performance comparison and limitations

Same script/browser, production preview, three cold contexts, 390×1000, 4× CPU throttle, 150ms latency, 1.6Mbps downlink / 750kbps uplink, cache disabled and external fonts blocked. Before inline CSS: 7688 / 7440 / 6444ms LCP, median **7440ms**. After: 5696 / 4920 / 3324ms, median **4920ms**. CLS was zero before and 0 / 0 / 0.000141 after. The median decreased 33.9% in this local sample; large host/load variation prevents attributing all of that change to CSS. These runs are not directly comparable to the historical 2884ms median from a different session. `readiness-performance-before.json` is an earlier contaminated exploratory run, retained explicitly as non-comparison evidence.

The implementation removes the initial render-blocking stylesheet round trip by embedding the 28KB stylesheet in prerendered HTML; Vite retains the emitted stylesheet for dependency bookkeeping. Build invariants and no-JavaScript/hydration E2E verify delivery. The existing design, font files and reduced motion remain. It adds no artificial timers to improve metrics. **LCP ≤2500ms is not met; INP ≤200ms is unmeasured; sampled CLS is below 0.1.** Trace resources and long tasks are retained in `readiness-performance-{baseline,after}.json`. Field measurement and physical low-end Android profiling remain necessary before any performance compliance claim.

### Review links and source commits

Draft [PR #7](https://github.com/jotel-dev/txguard/pull/7), targeting `main`, contains implementation [a7830c7](https://github.com/jotel-dev/txguard/commit/a7830c7) and evidence/demo documentation [03ce0ac](https://github.com/jotel-dev/txguard/commit/03ce0ac). [CI for the first pushed revision](https://github.com/jotel-dev/txguard/actions/runs/45263949401) must be read alongside checks for the latest PR head. This document does not freeze or invent an ongoing CI result. Branch synchronization was checked; `main` remained at submitted baseline `d210ec2`. Feature pushes may trigger automatic protected previews, but no explicit deployment or production promotion was executed.
