# Recipient assessment policy v2

Policy ID: `txguard-evidence-v2`. The score is a severity index, not an estimate of fraud probability, calibrated accuracy, or likelihood that a transfer will succeed. AI does not calculate or alter it.

## Inputs and coverage

GoPlus collector input is a validated mainnet address and chain (`ethereum`/1 or `bnb`/56). Other networks receive an explicit unsupported security status. `code !== 1`, malformed result, timeout and HTTP failure are unavailable. Missing documented binary fields produce partial coverage. Only literal string values `"1"` count as present signals and `"0"` as negative observations.

The normalized schema is `{status, source, signals: [{id, score, title, source, evidence}], note}`. Blockchain balance availability is separate from security evidence. Sparse or empty histories, new wallets, volume and wealth receive no fraud points. Mixer association is contextual only.

## Deterministic evaluation

Deduplicate by known signal ID. Assign only server-defined severity points. Use the maximum scored indicator, so correlated reports cannot inflate the index and old/high-volume history cannot dilute a serious report. If complete supported security fields are retrieved and no scored indicator is positive, the index can be 0, labeled low observed risk. If security fields are partial/unavailable/unsupported and no positive scored indicator exists, return `riskScore: null` and insufficient data. An actual positive signal can support its severity even if other fields are missing.

| GoPlus field | Points | Interpretation |
| --- | --- | --- |
| `sanctioned` | 95 | Provider sanctions indicator, not an independent current legal determination |
| `phishing_activities`, `stealing_attack`, `blackmail_activities` | 90 | Provider-reported harmful activity |
| `cybercrime` | 85 | Provider association report |
| `money_laundering`, `financial_crime` | 80 | Provider association report |
| `honeypot_related_address` | 65 | Address association, not a fresh token honeypot test |
| `fake_token`, `fake_kyc`, `malicious_mining_activities`, `fake_standard_interface` | 60 | Provider-reported relevant concern |
| `blacklist_doubt`, `darkweb_transactions` | 40 | Unconfirmed suspicion/association, not conclusive fraud |
| `gas_abuse`, `reinit` | 30 | Gas abuse or redeployable contract concern; neither proves approval abuse |
| `mixer` | 0 | Context, not proof of fraud |

The field vocabulary was checked against the [GoPlus address response documentation](https://docs.gopluslabs.io/reference/response-details-1). These weights are a disclosed conservative product policy; there is no measured accuracy or calibration claim. Not every reported association independently proves misconduct. Review original evidence, provider coverage and recipient identity.

| Index | Category |
| --- | --- |
| null | Insufficient data |
| 0–25 | Low observed risk |
| 26–50 | Caution |
| 51–75 | Suspicious |
| 76–100 | High risk |

Every result carries policy, assessment time, sources, limitations and precautions. Address-only checks do not inspect execution, approvals, balances of optional assets, all token contracts, beneficial ownership or comprehensive sanctions lists. Regression tests cover failures, missing fields, conflicting contextual history, duplicates, sparse evidence and exact categories.
