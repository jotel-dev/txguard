# TxGuard — Know Before You Send.

Track: Web3. Event: Iyin-Ekiti TechFest 2026. Sponsor: SkilledCrow. Dates supplied by the project owner: submission November 22, 2026, 11:59 PM Nigeria time; demo December 12, 2026.

## One-line summary

TxGuard helps crypto users identify suspicious wallet addresses and understand transaction risks before sending funds.

## Project description

Crypto transfers can be difficult or impossible to reverse. A Nigerian freelancer receiving new payment instructions or a P2P trader paying an unfamiliar counterparty often has to decipher several technical tools before making a decision.

TxGuard turns available wallet security intelligence and blockchain activity into a readable recipient assessment. Users choose a network, enter a public address and see retrieved indicators, actual recent activity, data sources, coverage limits and practical precautions. Scans are free and need no wallet connection. No seed phrases or private keys are requested.

The application validates addresses on Ethereum, BNB Chain, Solana, Bitcoin and Stacks. Security intelligence is currently integrated for Ethereum and BNB Chain. Other networks show real available activity with explicit insufficient-data security states. Optional Groq assistance selects an explanation grounded in server-owned evidence; the scan and explanation fallback work without AI credentials.

TxGuard also verifies the interface and existing anchored transactions of its deployed Stacks registry. These public blockchain records provide independently inspectable evidence that someone recorded a score, chain and address. They do not certify that the score is correct. This release offers read-only receipt checks and does not submit paid mainnet transactions.

## Why Web3 is essential

The core workflow reads actual public ledger data: balances, transactions, signatures, confirmation states and contract activity. Different chains are parsed according to their transaction models. The existing Stacks contract supplies public, persistent, permissionless scan assertions that can be inspected on a blockchain explorer. The UI does not treat public assertions as trusted security certification.

The benefit is practical: clearer evidence before irreversible transfers for freelancers, traders, small businesses and newer crypto users. TxGuard supports a decision; it cannot guarantee safety or prevent every scam.

## Working features to demonstrate

1. Recipient address validation with mainnet checksums and immediate invalid-address feedback.
2. Genuine GoPlus intelligence on Ethereum/BNB, with a disclosed deterministic severity policy.
3. Available Bitcoin, Solana and Stacks data; insufficient coverage never becomes a false safe score.
4. Actual recent transaction history with unknown amounts/timestamps/finality kept explicit.
5. Saved-wallet dashboard, device persistence, refresh, filters and scan history.
6. Contextual explanation, optional speech, downloadable report and local evidence hash.
7. Read-only existing Stacks receipt verification and clearly labeled demo fixtures.

## Public assets and status

| Asset | Link/status |
| --- | --- |
| Public repository | https://github.com/jotel-dev/txguard |
| Revamp branch | https://github.com/jotel-dev/txguard/tree/feat/txguard-2-reliability |
| Existing public application | https://txguard-gules.vercel.app — verified HTTP 200; revamp deployment still requires approval |
| Architecture | [architecture.md](architecture.md) |
| Security audit | [txguard-revamp-audit.md](txguard-revamp-audit.md) |
| Verification and limitations | [final-release-report.md](final-release-report.md), [historical verification](verification.md) |
| Environment and launch setup | [production-environment.md](production-environment.md) |
| Demo script | [demo-walkthrough.md](demo-walkthrough.md) |
| Desktop homepage | [screenshot](screenshots/desktop-home.png) |
| Mobile homepage | [screenshot](screenshots/mobile-lab-home.png) |
| Labeled insufficient-data example | [screenshot](screenshots/desktop-example-report.png) |
| Genuine local live recipient report | [screenshot](screenshots/live-recipient-report.png) |

## Limitations to disclose

EVM balance/history needs a compatible Etherscan key and plan. Non-EVM address-security intelligence, comprehensive sanctions screening, transaction execution simulation, ownership verification and approvals/honeypot checks are not implemented. Authenticated Redis/Etherscan and optional AI live calls remain unverified without credentials. Atomic shared quotas are implemented and tested with mocks; deployed APIs fail closed until Redis is configured. Cold mobile lab median LCP improved from 4.680 to 2.884 seconds with zero layout shift, but still exceeds the 2.5-second target. Chromium/Firefox/WebKit and Android-emulation checks pass; field metrics, physical Android and native Safari remain outstanding. Bitcoin history timed out in the final read-only probe. Existing automatic previews are login-protected; the production release has not been promoted. New mainnet receipt creation and payments are outside this release.

## Optional recording and slides

Record the four-minute walkthrough at 1080p, keeping the demo-fixture label visible whenever fixtures are used. Show actual explorer links and network status. Do not film wallet secrets or request paid transactions. Suggested five slides: irreversible-payment problem; recipient-check workflow; evidence and limitations; five-chain adapters plus Stacks receipt; local impact and next steps. Telegram, community reporting and extensive animation remain post-submission work.
