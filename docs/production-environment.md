# Server environment setup

No Etherscan, Redis or Groq credentials were available for live authenticated verification in this stabilization phase. Integration tests use mocks. Do not interpret passing mocks as proof that a configured account or plan works. No paid infrastructure, environment changes or deployment was performed.

## Configure in Vercel

In the existing TxGuard project, open **Settings → Environment Variables**. Add server-side variables to the intended Preview/Production environment only after reviewing that environment. Do not overwrite existing values without approval. Leave all names unprefixed: **never use `VITE_` for secrets**. For local verification, copy `web/.env.example` to ignored `web/.env.local`, populate it privately and restart Vite. Do not paste secrets into chat, issues, PRs, screenshots or logs.

| Variable | Required | How to obtain / value |
| --- | --- | --- |
| `UPSTASH_REDIS_REST_URL` | All deployed APIs | Select an existing database in the [Upstash console](https://console.upstash.com/redis); copy its HTTPS REST endpoint, such as `https://<database>.upstash.io`. Use the REST URL, not a `redis://` TCP connection string. No URL path, query or embedded credentials. |
| `UPSTASH_REDIS_REST_TOKEN` | All deployed APIs | From the same database's REST section, copy **Token**, not Readonly Token. The service needs `EVAL`, `GET`, `INCR`, `PTTL` and `PEXPIRE` on `txguard:*` keys. A restricted token with those permissions is suitable. |
| `RATE_LIMIT_HMAC_SECRET` | All deployed APIs | Generate a new cryptographically random secret of at least 32 characters (recommended 32 random bytes encoded as 64 hex characters). Use the same value across all TxGuard instances. A password manager or local Node crypto can generate it; store privately. Do not reuse an API key. |
| `ETHERSCAN_API_KEY` | EVM balances/history; optional for recipient security checks | Sign in at [Etherscan](https://etherscan.io/myapikey), create an API key following [the official setup guide](https://docs.etherscan.io/set-up-your-api-key), and check plan access for Ethereum mainnet `1` and BNB Smart Chain mainnet `56`. A BscScan-only key is not a V2 key. The plan must allow `balance`, `txlist`, `tokentx` for both chains; do not purchase a plan automatically. |
| `GROQ_API_KEY` | Optional | Create/manage an API key at [Groq console](https://console.groq.com/keys). Only the server calls Groq; absent/failing AI uses deterministic verified evidence. |
| `APP_ORIGIN` | Optional | Exact approved origin, e.g. `https://txguard-gules.vercel.app`, without a path or trailing slash. Request host is also checked for legitimate deployment URLs. |
| `RATE_LIMIT_GLOBAL_PER_MINUTE` | Optional, defaults `600` | Positive integer up to 10,000. Shared ceiling across all protected routes and clients in that environment. Select a conservative limit for actual provider/account capacity. |
| `RATE_LIMIT_AI_GLOBAL_PER_MINUTE` | Optional, defaults `30` | Positive integer up to 10,000. Additional shared AI ceiling across all clients. The application-wide cap still applies. |

An existing Vercel KV/Upstash integration may instead supply **both** `KV_REST_API_URL` and `KV_REST_API_TOKEN`. Those are supported aliases. Use one complete credential pair; a partial Upstash pair is rejected rather than combined with KV credentials.

Upstash [REST documentation](https://upstash.com/docs/redis/features/restapi) explains locating the endpoint/write token and JSON command bodies. If no existing database is available, the owner must choose and approve infrastructure separately. This application never creates or upgrades a database or paid service.

## Request protection behavior

One atomic Redis `EVAL` checks and increments three fixed-window quotas: the HMAC of a trusted client IP for that endpoint, the endpoint's global quota, and the app-wide global quota. Each key expires after 60 seconds. A rejected decision makes no partial increments. All keys share an environment-specific Redis hash slot; preview and production do not share counters. Raw IPs, wallet addresses, questions and API keys are not Redis key material or logs. Vercel-owned client-IP headers are used only on Vercel; local requests use the TCP peer and ignore spoofed forwarding headers.

Per-client/per-minute limits: scan 20, history 30, AI 8, registry 20, TTS 10, bug-report route 5. Endpoint global caps are 300 for scan/history/registry, 60 for TTS/bug reports and 30 for AI by default; the shared application cap is 600. Fixed windows can permit bursts near reset boundaries; they are not sliding-window guarantees or a volumetric DDoS defense. Use Vercel edge controls and account spending limits as additional protection.

- Successful requests include `RateLimit-Limit`, `RateLimit-Remaining` and `RateLimit-Reset`.
- A full quota returns HTTP **429**, with `Retry-After` seconds.
- Missing/invalid Redis credentials, a missing privacy secret, timeout, malformed response or Redis outage returns HTTP **503** with retry guidance **before** expensive providers or AI are called.
- Vercel (including previews) and `NODE_ENV=production` never fall back to memory. Local process-only limiting is available only in development when shared storage is not configured. It is not a production mode.

## Etherscan behavior and verification

The server sends requests to `https://api.etherscan.io/v2/api`, selecting `chainid=1` or `56`; keys never enter browser code. Missing keys, invalid keys, plan restrictions, malformed responses and upstream HTTP errors remain unavailable data. HTTP 429 and a V2 `NOTOK` rate-limit response trigger a short bounded local cooldown and retry guidance; no inference or unlimited retry follows. Token decimals must be explicit and valid. Balances/amounts use exact integer unit conversion. An explicit provider-confirmed empty history is different from unavailable history.

After configuring privately and restarting/redeploying only with approval, run the existing read-only provider verification script and compare an ETH and BNB balance/history against their explorers. Check token contract addresses, decimals, native values, pending/failed statuses and timestamps. Verify actual account plan support independently against [Etherscan's supported chains](https://docs.etherscan.io/supported-chains) and [error guidance](https://docs.etherscan.io/common-error-messages). No authenticated live result is claimed until those checks run with real credentials.

## Approval boundary

Adding variables here documents required configuration; it does not change Vercel. Deployment and merging still require explicit approval. Once approved/configured, verify rate limits across multiple deployed instances, repeat public smoke checks, inspect API headers and record the exact deployed commit. The public production domain has not been updated by this phase.
