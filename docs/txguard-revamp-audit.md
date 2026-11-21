# TxGuard 2.0 repository audit

Audit date: 2026-11-21 (Africa/Lagos). Baseline: cd176c3. Source review precedes implementation. Runtime results and remediation evidence are recorded separately in `verification.md`.

## Architecture and confirmed implementation

- `web/`: React 19, Vite 8, JavaScript, CSS; one 1,600-line component renders duplicate desktop/mobile interfaces. Vercel handlers call shared blockchain and risk modules. No root workspace scripts or CI exist.
- Five chain adapters exist: Etherscan V2 (Ethereum/BNB), Solana public JSON-RPC, Blockstream, Hiro. Addresses and history are fetched without a connected wallet. There is no transaction execution simulator in the live scan path.
- GoPlus address security is requested for EVM chains only. Groq generates report text and chat; secrets normally come from server environment.
- Dashboard addresses persist in localStorage. Existing records must be retained, but old scores have no provenance and cannot be trusted.
- `txguard-stacks/`: permissionless append-only Clarity registry; five existing simnet tests. `log-scan`, `get-scan`, `get-scan-count`, `get-total-scans` are implemented locally. Deployment YAML is not evidence of a successful deployment.
- `simulator/`: separate Express mock ledger, random delay/failure and random risk jitter. It is not blockchain simulation and is not connected to production.
- No real payment processing, backend authentication, account database, or scan purchasing exists. Free scans are the correct demo scope.

## Findings and priority

| Severity | Finding | Evidence / consequence | Planned repair |
| --- | --- | --- | --- |
| Critical | False-safe scores on failed/unsupported security providers | `goplusCheck` returns false flags on failure; non-EVM checks bypass intelligence; 70/30 formula produces SAFE | Explicit provider states; null score when intelligence is unavailable; deterministic evidence policy |
| High | Automatic mainnet wallet prompt after scans | `analyze` schedules `logScanToStacks` automatically | Remove automatic writes; preserve read-only verification. Creation needs separately approved scope |
| High | Fabricated blockchain claims | Fixed Solana/Bitcoin category percentages, sample dashboard balances/scores, sampled history presented as wallet age, unknown times replaced by now | Remove fixtures from live state; preserve unknowns and sample scope |
| High | Missing server address and body validation | User-controlled chain/address interpolated into upstream paths; unbounded payloads | Shared checksum validators, strict schema/size/method checks |
| High | Unbounded expensive unauthenticated endpoints | No rate limits or provider timeouts; wildcard CORS | Bounded requests, same-origin policy, local throttling with documented distributed limitation |
| High | AI controls unverified report fields and is required | Prompt asks for best assessment without data; no response schema; missing key aborts scan | Deterministic report first; bounded structured explanation with fallback; server-owned chat context |
| High | Potential browser credential exposure | `VITE_ETHERSCAN_API_KEY` fallback in shared adapter | Server-only credentials; remove client-secret fallback |
| Medium | Transaction correctness | EVM provider error string treated as list, precision loss; BTC lowercases case-sensitive addresses and sums only first inbound output; Stacks pending becomes failed; Solana unknown details become zero | Exact units, explicit finality and missing values, chain-specific parsers |
| Medium | Receipt claims lack finality or provenance | Wallet callback immediately says logged; public scores can be supplied by anyone; addresses stored in public plaintext | Read-only verification of actual contract call and status; explain limitations; preserve deployed ABI |
| Medium | Dashboard races and storage failures | Sequential refresh mutates nested state; unguarded localStorage writes; no timestamps | Validated migration, bounded refresh, functional updates, recoverable storage errors |
| Medium | Bug report persistence falsely claimed | `/tmp` storage exceptions ignored; success always returned | Honest unsupported service with public issue link |
| Medium | Deployment and local API mismatch | No SPA fallback/security headers; repeated middleware; local TTS response lacks send | Unified bounded local adapter and Vercel routing/headers |
| Medium | Accessibility and mobile duplication | Clickable spans/divs; unlabeled fields; two copies of results; hidden overflow; dead buttons | One responsive semantic UI, labels, keyboard/focus/status/reduced-motion support |
| Medium | Missing production tests and CI | No web tests; simulator logs assertion failures without failing | Node unit/API security tests, browser E2E, CI and contract regression tests |
| Low | Excess CSS/font/asset costs | Multiple Google font families and import; unused large images | One font pair, remove unused request paths, measure production bundle |

## Scoring review

The advertised 70% GoPlus / 30% behavior formula exists, but a malicious flag (80) becomes only 56 with neutral history. The behavioral half counts sampled history, conflates age with safety, and normalizes arbitrary points. Missing signals look negative. Replace with the maximum severity of distinct normalized intelligence signals, documented thresholds, and non-scoring contextual observations. Lack of intelligence must remain insufficient data even when a balance is available.

## Integration and contract gaps

Security coverage is EVM-only; native balances/history on the other networks cannot establish absence of malicious activity. Etherscan requires a configured key and plan supporting the requested chain. Token approval, honeypot, sanctions and full execution prediction are not implemented and must not be claimed. Bitcoin has multiple inputs/outputs; a single sender/recipient can mislead. Registry has score bounds but intentionally allows duplicates, arbitrary chain strings, empty targets, and submissions by any principal. It provides public user assertions, not trusted security certification. Do not change/deploy its ABI or spend mainnet funds.

## Performance and production risks

No measured baseline exists yet. Requests have no deadlines, scan and history duplicate calls, dashboard refresh is serial, Groq retries duplicate inference, wallet SDK loads in the initial bundle. No secrets have been printed. Dependencies must be installed and audited before any clean-security claim. Local process throttling does not replace Vercel firewall limits across instances. Existing public links and contract deployment require independent read-only verification; browser fetch attempts initially failed and do not establish availability.

## Implementation order

1. Add shared validation, bounded provider collection, deterministic risk and regression/security tests. Fix optional AI, endpoint policy and automatic write behavior before visual work.
2. Refine existing React application into one responsive scan/report/dashboard flow; retain saved addresses, contextual chat and speech. Clearly labeled fixture examples and actual history. Paid receipt writing is excluded; retain read-only deployed-contract/receipt verification.
3. Read-only contract/source/receipt verification; security regression tests without contract deployment.
4. Production build, lint, dependency audits, deterministic E2E at required viewports, measured artifacts and CI.
5. Accurate README, architecture, deployment checklist, demo script, screenshots, submission and remaining-risk report. Commit and push verified stages on the feature branch. Deployment, merging and paid transactions remain excluded.

## Remediation evidence

The reviewed scan-path critical/high findings have implementation and regression coverage in the revamp branch. [verification.md](verification.md) records actual test, provider, contract-source and existing-receipt results and remaining operational risks. Production abuse protection still needs distributed edge configuration. EVM activity needs approved explorer credentials; Groq remains optional. Source inspection alone is not a claim that every deployed feature or every chain is fully covered. No production deployment or paid writes were performed.
