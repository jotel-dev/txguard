# Four-minute demo walkthrough

Use the approved deployed revision or explicitly identify a local demonstration. The old public app is not evidence that this branch is deployed. Recheck providers before presenting.

## 0:00–0:30 — Problem

“A freelancer gets new payment instructions. A P2P trader receives an unfamiliar address. Crypto transfers can be hard to reverse, yet investigating a recipient often means decoding several technical tools. TxGuard gives everyday users a readable check before they decide.”

## 0:30–1:00 — Workflow

Open the homepage. Show the public-address form and select Ethereum. Explain that no wallet, private key, sign-in or payment is required. Optional asset/amount context does not simulate execution. Briefly choose an invalid input and show immediate validation.

## 1:00–2:15 — Genuine live scan

In Demo Examples, choose **Load documented address**, then **Check address**. The address is `0x098b716b8aaf21512996dc57eb0615e2383e2f96`, listed in [OFAC’s April 14, 2022 historical update](https://ofac.treasury.gov/recent-actions/20220414). This source documents the historical association; it is not a substitute for current provider evidence.

During verification GoPlus returned stealing-attack, sanctions and blacklist-suspicion indicators. Do not promise those fields or the score will remain unchanged. Show what the live request actually retrieved, its timestamp and source statuses. If the provider is unavailable, explain the insufficient-data state rather than changing to an undisclosed mock.

For an available no-scored-indicator example, use `0x0000000000000000000000000000000000000001` on Ethereum. This is a public EVM precompile address used to demonstrate provider coverage, not a claim about a normal human wallet or a payment destination. A provider-negative result does not guarantee safety. For an everyday wallet demonstration use a consenting owner's public address and inspect its current result first.

## 2:15–3:00 — Evidence and uncertainty

Select Bitcoin and scan the publicly known genesis recipient `1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa`, or use an owner's public Stacks address. Open Transaction History. Explain actual outputs/signatures/statuses and why native balance/history alone cannot establish security. Missing timestamps stay unknown. Ask TxGuard about coverage; if no Groq key is configured, identify the deterministic fallback.

Show the explicitly labeled **An unavailable provider** fixture. State aloud that it is synthetic and saved separately from no live history. It demonstrates the null-score outcome without disrupting genuine providers.

## 3:00–3:30 — Real Web3 receipt

Open receipt tools and verify the existing Stacks transaction:

`0x5b650d7c34b8784ec2f144244173cc2e23a1e69f1e41cd332e02a0f6dfd6c082`

[Inspect on Stacks explorer](https://explorer.hiro.so/txid/0x5b650d7c34b8784ec2f144244173cc2e23a1e69f1e41cd332e02a0f6dfd6c082?chain=mainnet). Read-only checks confirmed an anchored successful registry call at height 8495105. Recheck its current canonical status during the demo.

Explain: “This is an existing public assertion containing a chain, address and score. It does not prove that score correct or associate itself with the report currently on screen. The downloaded report's local hash is not an onchain receipt.” Do not connect a wallet or create a fee-bearing record.

## 3:30–4:00 — Practical impact

Save a scanned wallet. Open Dashboard, reload and refresh. Show the source timestamp and device-local storage. Conclude with the mission: helping Nigerians, P2P traders, freelancers and small businesses review evidence before irreversible payments. Explicitly disclose supported coverage and the limits of risk assessment.

## Recovery and preparation

- Keep `npm run dev` ready as a clearly identified local backup if the revamp deployment is not approved/available.
- Verify the public URL and the exact deployed commit after approval. Prepare at least one genuine scan; clearly labeled fixtures supplement it.
- If Etherscan is not configured, show missing EVM activity honestly and use Bitcoin/Stacks for genuine history.
- If provider access fails, show the real insufficient-data result and the labeled fixture. Never claim a fixture is live intelligence.
- Use the bundled screenshots as recording aids, not proof of a currently functioning public deployment.
