# TxGuard — Know Before You Send.

Check the address. Understand the risk. Decide before you send.

TxGuard is a free recipient risk assessment tool for everyday crypto users, freelancers, P2P traders and small businesses. It combines available blockchain activity with provider-reported security indicators, explains coverage limits, and lets users inspect actual transaction history. No wallet connection, private key, seed phrase or payment is required.

[Existing public app](https://txguard-gules.vercel.app) · [Repository](https://github.com/jotel-dev/txguard)

The 2.0 revamp is on `feat/txguard-2-reliability`. The existing public app returned HTTP 200 during verification; this branch has **not been deployed**.

## What is implemented

- Shared mainnet address validation: EIP-55 EVM checksums, Solana 32-byte Base58 keys, Bitcoin Base58Check / SegWit / Taproot checksums, Stacks c32 principals and contract principals.
- Deterministic evidence-based categories: Low observed risk, Caution, Suspicious, High risk, and **Insufficient data**. Missing coverage has a null score, never a fabricated zero.
- Concurrent bounded provider collection, scan deduplication and short-lived caches. Free scans continue without AI or Etherscan credentials.
- Responsive scan form, downloadable report, explicit sources, limitations and exact native-unit formatting.
- Real recent blockchain history, with pending/failed/unknown statuses kept distinct and missing amounts/times left unknown.
- Locally saved wallets, search/filter, bounded refresh and the last 20 live scan summaries. Existing valid saved addresses migrate; unverifiable legacy scores and example balances are cleared.
- Contextual Ask TxGuard: optional server-side Groq chooses an explanation focus; server-owned evidence supplies all factual prose. Deterministic fallback remains usable without a key.
- Native speech with a bounded optional audio fallback.
- Read-only Stacks contract and existing receipt verification. No automatic wallet prompts or mainnet writes.
- Clearly labeled synthetic demo scenarios and a sourced historical address that users can load for a genuine live check.

## Network coverage

| Network | Blockchain activity | Address-security intelligence |
| --- | --- | --- |
| Ethereum | Etherscan V2 native balance, normal transactions and ERC-20 events; key/plan required | GoPlus address-security fields |
| BNB Chain | Etherscan V2 chain ID 56; key/plan required | GoPlus address-security fields |
| Solana | Finalized native balance; recent signatures and conservatively decoded transfers | Not integrated; insufficient data |
| Bitcoin | Confirmed balance/statistics; recent transactions including mempool observations | Not integrated; insufficient data |
| Stacks | Native balance and recent activity from Hiro | Not integrated; insufficient data |

An address assessment is **not transaction simulation**. Optional token and amount fields do not validate token ownership, approvals, execution or available token balance. No ownership guarantee, comprehensive sanctions screening or honeypot analysis is provided. A low observed risk score never guarantees safety.

## Run locally

Use Node.js 24 and npm. On Windows PowerShell, use `npm.cmd` if script execution policy blocks `npm.ps1`.

```sh
cd web
npm ci
cp .env.example .env
npm run dev
```

Vite serves the frontend and all six local `/api/` handlers. `GROQ_API_KEY` and `ETHERSCAN_API_KEY` are optional server-only variables. Never prefix secrets with `VITE_`. `APP_ORIGIN` is optional; set the actual origin in a deployment. `npm run preview` serves the static production build only; it does not emulate serverless APIs.

```sh
# web/
npm run check                 # lint, unit/API/security tests, production build
npx playwright install chromium
npm run test:e2e              # deterministic browser journeys, seven widths and axe
node scripts/verify-live.mjs  # read-only public integration checks; no signing

# Windows installed Edge alternative
# $env:PLAYWRIGHT_CHANNEL='msedge'; npm run test:e2e

# txguard-stacks/
npm ci
npm test                     # local Clarinet simnet, never mainnet

# simulator/
npm ci
npm test                     # deterministic mock ledger/API checks
npm start                    # local mock service on 127.0.0.1:3000
```

The simulator is entirely synthetic and never supplies production scan data. Its numbers and settlement behavior are not blockchain intelligence.

## Stacks registry

Existing mainnet contract: [`SP3QKY6WR398BJHPP23VKKEQXQ0T1H1HAQ1BKQFKM.registry`](https://explorer.hiro.so/address/SP3QKY6WR398BJHPP23VKKEQXQ0T1H1HAQ1BKQFKM.registry?chain=mainnet).

Read-only verification confirmed its interface, deployed source (matching local code ignoring comments/whitespace), and an existing anchored successful `log-scan` call. See [live evidence](docs/live-verification.json). A registry entry records a public assertion from a submitter. It does not authenticate TxGuard, prove the score correct, or bind the entry to a downloaded report. Existing entries may be duplicates or arbitrary submissions. This release verifies existing receipts and does not create paid mainnet entries.

## Documentation and submission

- [Repository audit](docs/txguard-revamp-audit.md)
- [Architecture and APIs](docs/architecture.md)
- [Scoring policy](docs/risk-policy.md)
- [Verification, measurements and limitations](docs/verification.md)
- [Deployment checklist](docs/deployment-checklist.md)
- [Hackathon submission](docs/hackathon-submission.md)
- [Four-minute demo walkthrough](docs/demo-walkthrough.md)
- [Desktop screenshot](docs/screenshots/desktop-home.png) · [Mobile screenshot](docs/screenshots/mobile-lab-home.png)

Deployment, production environment changes, contract upgrades, paid transactions and merging require explicit approval. Configure distributed edge rate limits before public production traffic: in-process throttling alone does not cover multiple serverless instances.
