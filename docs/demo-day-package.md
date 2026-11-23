# TxGuard demo day package

Team Nova Stack · Web3 · Iyin-Ekiti TechFest 2026 · SkilledCrow

Dates supplied by the owner: finalists December 1; demo December 12, 2026 (Africa/Lagos). This is development material. Competition permission to modify the submitted deployment remains unverified.

## Reproducible live demonstration (four minutes)

Before presenting, open the approved public deployment, check a scan and inspect an explorer. Keep this file and the existing 90-second video locally. Use a fresh browser profile containing no personal wallets, keys or account tabs. Do not run live load tests during the event.

1. **0:00–0:30, problem.** “A Nigerian freelancer or P2P trader gets new crypto payment instructions. A wrong transfer can be irreversible. TxGuard helps them understand available warning signs before sending.” Do not promise scam prevention.
2. **0:30–1:10, live scan.** Open `https://txguard-gules.vercel.app`, select Ethereum, paste the public demonstration address `0x0000000000000000000000000000000000000001`, and press Check address. This address is chosen for reproducibility, not as a recommended recipient. Clearly say the result is live and may change. Explain the timestamp and coverage. If no scored indicators appear, say “low observed risk is not a safety guarantee.”
3. **1:10–1:40, evidence.** Show sources, limitations and one available warning with attribution. An optional second example is the historically documented `0x098b716b8aaf21512996dc57eb0615e2383e2f96`; recheck current provider findings before presenting it. Do not describe provider reports as a legal determination or current ownership proof.
4. **1:40–2:10, history.** Open Transaction history and one real explorer link. Explain sender, recipient, native value, token contract, timestamp and status. Contract interactions can contain more actions than the decoded transfer. Unknown fields stay unknown.
5. **2:10–2:45, Web3 evidence.** Open receipt tools. Verify historical Stacks transaction `0x5b650d7c34b8784ec2f144244173cc2e23a1e69f1e41cd332e02a0f6dfd6c082`. Only call it confirmed if the current check returns canonical anchored success. Explain: “It proves someone registered this public assertion, not that the assessment is accurate or a wallet is safe.” The old record is unrelated to the current scan. The private commitment contract is a local tested candidate, not a deployed feature.
6. **2:45–3:20, accessibility.** Show the same scan at 390px or on an actual phone if available. Demonstrate readable warnings, network selector, keyboard focus and saved-wallet dashboard. Say which device is actually used.
7. **3:20–4:00, impact and close.** “Available blockchain facts, clear coverage and understandable precautions can help users make a better informed decision. Our next steps are broader verified data coverage, physical-device testing and a reviewed private receipt rollout.” Invite technical questions.

## Honest fallback demonstration

If a provider fails, show the error/coverage state first. Open the application's explicitly labeled example flow. Keep the fixture banner visible and say: “This is a prepared example, not current blockchain intelligence.” Use screenshots in `docs/screenshots/` and the locally saved existing video if connectivity fails completely. The example should never be saved or described as a live result. Do not replace failed network responses with fixtures silently. A recorded explorer image is historical evidence; it does not establish present confirmation.

Offline local fallback: from `web`, run `npm.cmd run build`, then `npm.cmd run preview -- --host 127.0.0.1 --port 4173`. Open that URL and choose a labeled example. Preview serves static content; live API calls need the development API server or an approved deployed backend. Browser wallets and paid transactions are unnecessary for the pitch.

## Eight-slide deck content

| Slide | On-screen content | Speaker guidance |
| --- | --- | --- |
| 1 · TxGuard | **Know Before You Send.** Nova Stack. Recipient intelligence before irreversible crypto transfers. | Introduce the product and team; do not invent traction. |
| 2 · The problem | Unfamiliar payment instructions. Irreversible transfers. Fragmented technical evidence. | Use a freelancer or P2P counterparty story, identified as an illustrative scenario. |
| 3 · Who needs it | Nigerian freelancers, P2P traders, small businesses and newer crypto users. Mobile-first access, understandable language. | These are target users, not measured customer segments or adoption claims. |
| 4 · Our solution | Choose network → check public address → understand evidence, coverage and precautions. Free scanner; no connected wallet required. | Demonstrate practical decisions without claiming a guarantee. |
| 5 · Product demonstration | Live scan, real history, sources, insufficient-data states, saved-wallet dashboard. | Label all screenshots/fixtures and keep failure states honest. |
| 6 · Web3 architecture | Five mainnet adapters → normalized data → deterministic severity policy → readable report. Stacks: existing assertion verification; private commitment candidate tested locally. | AI selects explanatory focus and cannot change findings. Receipt registration does not certify accuracy. |
| 7 · Differentiation and business | Multi-chain presentation, beginner explanations, transparent coverage, no fabricated safe states. Future paid monitoring/API/team tools. | GoPlus is a data source, not something we claim to outperform in detection. Payments/subscriptions are not implemented; core scans remain free. |
| 8 · Roadmap and close | Verified indexing coverage, reviewed private receipts, physical-device validation, optional monitoring later. **Know Before You Send.** | Ask for feedback and technical support. Do not claim partnerships, revenue, detection accuracy or user counts. |

## Technical questions and accurate answers

**Why blockchain?** The scanner reads public ledger state and actual transactions. Blockchain also allows an independently inspectable registration record. Security scoring itself does not require writing every scan onchain.

**Why Stacks?** The project already has a deployed Clarity registry and local simnet tests. Its public records can be checked independently. Do not imply that Bitcoin consensus independently validates our risk assessment.

**How does scoring work?** Server-owned severity points are assigned to recognized provider indicators; the strongest distinct indicator determines the score. Positive balance/history cannot dilute it, duplicates cannot inflate it, and insufficient coverage produces no score. These points are policy, not a fraud probability.

**How is this different from GoPlus?** GoPlus supplies EVM address-security intelligence. TxGuard adds address/network validation, normalized activity, explainable policy, understandable reports, saved-wallet workflows and receipt verification. It does not claim a superior detection database.

**False positives?** Indicators are attributed provider reports, including suspicion/context labels. Users see limitations and should independently verify important warnings. There is no claim of adjudicated fraud or a calibrated false-positive rate.

**Provider failures?** Bounded requests and honest unavailable/partial states preserve the scanner. Missing security coverage never produces a safe score. Missing Groq uses deterministic explanation. Production request protection fails closed if Redis cannot be used.

**What does a receipt prove?** A successful canonical anchored call proves registration by a submitter. A matching salted commitment additionally binds disclosed bytes to that registration when implemented on a reviewed contract. Neither certifies assessment truth. The current deployed registry stores public assertions; the private candidate remains local.

**Privacy?** No seed phrases or private keys are requested. Scanned addresses go to the relevant providers. Saved summaries live in browser storage. The candidate commits to normalized evidence with a fresh secret 32-byte nonce; the nonce and assessment stay private. Submitter and timing remain public if later registered. Plain hashes of predictable addresses/scores do not provide adequate privacy.

**Nigerian relevance?** The intended users include freelancers, traders and small businesses handling unfamiliar counterparties. Readable mobile reports reduce the need to interpret multiple explorers. This is a product hypothesis and user need, not demonstrated adoption or a statistical impact claim.

**Business model?** Free core scans today. Optional future monitoring, team/API tools or advanced analytics could fund the service. There is no working payment processor, subscription or paywall in this release.

**Scaling?** Server-side provider calls, bounded caches/deduplication, atomic Redis quotas, endpoint/global ceilings, and static public HTML reduce unnecessary work. Full address indexing and provider quotas remain constraints. Caches and telemetry are per instance; do not describe them as global storage.

## Exact manual device checklist

Test the approved candidate with Chrome on an affordable Android phone, Firefox, and native Safari on an iPhone/Mac. Record model, OS, browser version, network, date and revision. Browser emulation does not replace these tests.

- At 320, 375, 390, 428, 768, 1024 and 1440px: confirm no horizontal overflow, clipped address fields, covered buttons or unreadable warnings.
- On a slow mobile connection: load cold, select each chain, paste valid/invalid addresses, scan, cancel/change chain mid-request and retry after failure. Check that old responses cannot replace the new recipient.
- Use touch, Android keyboard, iOS keyboard and clipboard: confirm focus, paste/copy, keyboard dismissal, scrolling and navigation.
- Review live and insufficient-data reports, real history/explorer links, AI fallback, save/reload/remove wallets and clear history. Test storage denied/private browsing.
- Verify an existing pending/failed/confirmed receipt; ensure no unconfirmed transaction is called confirmed. On the development candidate, export a private package and verify it offline. Do not submit mainnet transactions.
- Enable reduced motion and device screen reader; traverse by keyboard where available. Check labels, focus, loading/error announcements, color contrast and zoom to 200%.
- Record results and screenshots containing no secrets. Document failures instead of checking boxes based on emulation.
