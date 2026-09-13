<p align="center">
  <img src="public/images/vector52-cover.jpeg" alt="Vector52 — evidence-first blockchain forensic workspace" width="100%" />
</p>

<p align="center">
  <strong>Evidence-first blockchain investigations for people and AI agents.</strong><br />
  Follow wallet flows, preserve provenance, audit a claim, and use x402 only when a paid investigation is explicitly authorized.
</p>

<p align="center">
  <a href="#quick-start">Quick start</a> ·
  <a href="#architecture">Architecture</a> ·
  <a href="#web-wallet-flow">Web wallet flow</a> ·
  <a href="#mcp-agent-flow">MCP agent flow</a> ·
  <a href="#security-boundaries">Security</a> ·
  <a href="#verification">Verification</a>
</p>

# Vector52 Frontend

Vector52 is a React, TypeScript, Vite, and PWA frontend for an evidence-oriented blockchain forensics workflow. It gives an investigator two distinct access paths:

- **Web Wallet** — a person connects a wallet with Reown, reviews balances, signs an authentication challenge when needed, and approves an exact x402 payment before a wallet-flow investigation runs.
- **MCP Agent** — an external agent such as Codex, Claude Code, OpenCode, or Cursor discovers the Vector52 MCP tools and pays through its own controlled MCP signer before invoking a paid operation.

The interface is deliberately not a substitute for a block explorer and does not claim to identify people, recover funds, or prove fraud. It turns public-chain activity into a bounded, reproducible investigation with visible sources, warnings, and limits.

> **Scope and honesty:** the frontend renders `UNKNOWN`, `DEGRADED`, `PARTIAL`, errors, and backend warnings as returned. It never turns an unavailable provider, a failed payment, or an unreachable MCP service into a successful investigation.

## Contents

- [Product capabilities](#product-capabilities)
- [Architecture](#architecture)
- [Repository layout](#repository-layout)
- [Requirements](#requirements)
- [Quick start](#quick-start)
- [Environment configuration](#environment-configuration)
- [Application routes](#application-routes)
- [Web wallet flow](#web-wallet-flow)
- [MCP agent flow](#mcp-agent-flow)
- [API contract](#api-contract)
- [x402 safety model](#x402-safety-model)
- [Development](#development)
- [Deployment](#deployment)
- [Verification](#verification)
- [Security boundaries](#security-boundaries)
- [Troubleshooting](#troubleshooting)
- [Related repositories](#related-repositories)

## Product capabilities

| Area | What the frontend provides |
| --- | --- |
| Onboarding | A short, cinematic product introduction separated from the operational workspace. |
| Wallet map | Wallet-address input, 7/30/90-day or custom date windows, incoming/outgoing flow visualization, source and limit reporting. |
| Claim audit | A transaction, claim, and subject form backed by the versioned claim-audit API, with verdict and evidence panels. |
| Evidence | Evidence inspector, source/provenance metadata, warnings, and a clear distinction between facts and derived conclusions. |
| Web access | Reown AppKit / WalletConnect integration, signed wallet session, Avalanche Fuji balances, and exact-payment x402 execution. |
| Agent access | An MCP access hub for Claude, Codex, OpenCode, Cursor, and generic clients, including live backend-reported service state and tool discovery. |
| PWA | Web manifest, service worker, install affordance, and a standalone `/app` entry point. |
| Localization | English and Spanish interface copy; English is the default project documentation language. |

## Architecture

The browser talks to the Vector52 backend through same-origin routes. During local development, Vite proxies these routes; in production, Vercel rewrites them. This keeps the browser out of the backend provider and payment-secret boundary.

```text
                              ┌──────────────────────────────┐
                              │  Vector52 Frontend (this repo) │
                              │ React · Vite · PWA · TypeScript│
                              └───────────────┬──────────────┘
                                              │ same-origin /healthz and /v1
                         ┌────────────────────┴────────────────────┐
                         │                                         │
                         ▼                                         ▼
            Web Wallet access path                         Agent access path
          Reown + signed session                         status and capability UI
                         │                                         │
                         ▼                                         ▼
               exact x402 authorization                 Codex / MCP client
                         │                                         │
                         └────────────────────┬────────────────────┘
                                              ▼
                              ┌──────────────────────────────┐
                              │      Vector52 Backend         │
                              │ FastAPI · evidence · x402     │
                              └───────┬─────────────────┬──────┘
                                      │                 │
                                      ▼                 ▼
                           RPC / indexed sources   Vector52 MCP service
                           (e.g. Alchemy)          + local agent signer
```

### Proxy behavior

- `vite.config.ts` proxies `/healthz` and `/v1` to `VITE_API_PROXY_TARGET`. If unset, it falls back to `http://127.0.0.1:8000`.
- `vercel.json` rewrites the same paths to the deployed backend.
- `VITE_API_BASE_URL` is intentionally empty by default. Set it only when you deliberately want the browser to bypass the same-origin proxy and you have configured CORS correctly.

## Repository layout

```text
v52/
├── public/                     # PWA icons, original illustrations, sponsor assets
├── src/
│   ├── api/                    # Typed HTTP client and API-boundary tests
│   ├── components/             # Workspace, access hub, graph, evidence, and form UI
│   ├── domain/                 # API contracts, validation, and locale types
│   ├── web3/                   # Reown/AppKit and exact x402 browser payment client
│   ├── App.tsx                 # Routes, top-level state, refresh lifecycle
│   ├── main.tsx                # React entry point
│   └── styles.css              # Visual system and responsive styles
├── tests/                      # Vitest setup
├── .env.example                # Public frontend configuration template
├── vercel.json                 # Production same-origin backend rewrites
├── vite.config.ts              # Vite, Vitest, PWA, and development proxy setup
└── package.json                # Scripts and dependencies
```

## Requirements

- Node.js **22+** recommended.
- `pnpm` **11.19.0** (the version pinned in `package.json`).
- A running Vector52 backend for live API behavior.
- A Reown project ID only when testing the Web Wallet path.
- An Avalanche Fuji test wallet with test AVAX and test USDC only when executing an x402 payment.

## Quick start

From this directory:

```bash
pnpm install --frozen-lockfile
Copy-Item .env.example .env
pnpm dev
```

Open `http://localhost:5173`. The default development proxy expects the backend at `http://127.0.0.1:8000` unless `VITE_API_PROXY_TARGET` is set.

On macOS or Linux, replace the PowerShell copy command with:

```bash
cp .env.example .env
```

### Fast local setup with the deployed backend

The committed defaults point the Vite proxy to the deployed backend. Create `.env` from the example and leave the following values as shown when that is the intended development target:

```dotenv
VITE_API_BASE_URL=
VITE_API_PROXY_TARGET=https://v52-backend.onrender.com
VITE_REOWN_PROJECT_ID=
VITE_MCP_SERVER_URL=https://v52-mcp-production.up.railway.app/mcp
```

`VITE_REOWN_PROJECT_ID` may remain empty for read-only workspace development. Wallet connection controls will direct the user to configure Reown until it is supplied.

## Environment configuration

Only public browser configuration belongs in this file. Use `.env.example` as the source of truth.

| Variable | Required | Purpose | Security notes |
| --- | --- | --- | --- |
| `VITE_API_BASE_URL` | No | Explicit API base URL. Empty uses same-origin routes. | Do not use it to expose private backend URLs or credentials. |
| `VITE_API_PROXY_TARGET` | Local development | Target used by Vite for `/healthz` and `/v1`. | This is a development-server setting, not a secret. |
| `VITE_REOWN_PROJECT_ID` | For Web Wallet | Public Reown Cloud project identifier. | Register localhost and each production origin in Reown Verify. It is not a private key. |
| `VITE_MCP_SERVER_URL` | For remote MCP UI | Public Streamable HTTP endpoint shown by the Agent Access panel. | Never place a private key, bearer token, or server-only credential in `VITE_*`. |

### Never put these in the frontend

Do **not** add any of the following to `.env`, Vercel public variables, source code, screenshots, or prompts:

- private keys or seed phrases;
- Alchemy, The Graph, or relayer API keys;
- backend bearer tokens;
- MCP signer credentials;
- database URIs or internal RPC endpoints.

All `VITE_*` values are included in the browser bundle and therefore must be treated as public.

## Application routes

| Route | Purpose |
| --- | --- |
| `/` | Product introduction. It does not expose the operational workspace navigation. |
| `/app` | Main investigation workspace and PWA start route. |
| `/project` | Product framing, methodology, limits, and differentiation from an explorer. |

The PWA manifest starts at `/app` with `display: standalone`. Vite PWA registration is configured for automatic service-worker updates.

## Web wallet flow

The Web Wallet path is for an investigator operating in the browser. Wallet connection alone does not perform a payment or start an investigation.

```text
Connect wallet
  → show account, chain, USDC balance, and AVAX balance
  → user chooses Investigate
  → request or reuse a signed wallet session
  → read server capabilities (network, asset, exact amount, pay_to)
  → switch to Avalanche Fuji when necessary
  → receive HTTP 402 Payment Required
  → wallet signs the exact permitted USDC authorization
  → payment facilitator verifies and settles
  → backend executes wallet-flow acquisition
  → frontend requires a settlement receipt, then renders the result
```

Important implementation details:

- The browser’s x402 policy accepts only `eip155:43113` (Avalanche Fuji), the exact asset, exact recipient, and exact atomic amount announced by backend capabilities.
- The frontend blocks parallel paid investigation requests.
- A `200` response without a verifiable `settled` payment result is rejected.
- A connected wallet and an investigated wallet are separate concepts and remain separate in state and UI.
- Date filters are sent as `from_date` and `to_date`; the backend returns the applied window and pagination limits in the result.

## MCP agent flow

The PWA is an MCP **control surface**, not an MCP client and not a custodian of an agent’s wallet. It asks the backend for the real integration status, published tools, billing facts, and warnings; the external agent invokes the actual MCP tools.

```text
Vector52 PWA
  ├─ GET /v1/agent/capabilities
  ├─ GET /v1/integrations/mcp/status
  └─ GET /v1/integrations/mcp/tools
          │
          ▼
Vector52 Backend verifies the configured MCP service without charging
          │
          ▼
Codex / Claude Code / OpenCode / Cursor MCP client
          │
          ▼
Vector52 MCP signer validates payment policy before a paid tool runs
          │
          ▼
x402 settlement on Avalanche Fuji → Vector52 backend → investigation response
```

The Agent Access panel refreshes when opened, on demand, and every 30 seconds while active. It enables its test prompt only when the backend reports `READY`, a `pay_to` address, and a price. `UNAVAILABLE`, `UNKNOWN`, network errors, and missing tool discovery remain visible failure states.

### Codex configuration

Use the deployment transport that actually matches the MCP service.

For a public **Streamable HTTP** endpoint, the Codex CLI command is:

```bash
codex mcp add vector52 --url https://your-vector52-mcp.example/mcp
```

The Agent Access panel can display the equivalent `config.toml` snippet for the configured endpoint. Restart Codex after updating its configuration and confirm the MCP server appears in Codex before attempting a paid tool.

The companion `v52-mcp` repository also documents a **local stdio** mode. That mode is launched as a local process, rather than through an HTTP URL. A representative Codex configuration is:

```toml
[mcp_servers.v52_mcp]
command = "npx"
args = ["-y", "v52-mcp"]
startup_timeout_sec = 20
tool_timeout_sec = 60
default_tools_approval_mode = "prompt"
```

Keep the agent’s Fuji burner-wallet key in the local process environment or a Git-ignored local `.env` file. Do not paste it into the Vector52 UI, `config.toml`, a chat, or a prompt. See the companion MCP README for the exact environment and policy requirements.

### Remote team gateway versus local signer

| Mode | Intended use | Payer | Constraint |
| --- | --- | --- |
| Local signer | Recommended for an individual agent user | The user’s local Fuji burner wallet | The signer and policy stay on the user’s device. |
| Team gateway | Controlled demonstration only | The service’s configured team wallet | A single server signer is not a multi-user payment account. |

## API contract

All application requests go through the typed `Vector52Client` in `src/api/vector52Client.ts`. The frontend does not invent fallback data when a request fails.

### Read and capability endpoints

| Method | Endpoint | Used for |
| --- | --- | --- |
| `GET` | `/healthz` | API availability indicator. |
| `GET` | `/v1/web/capabilities` | Web Wallet payment channel facts. |
| `GET` | `/v1/agent/capabilities` | Agent x402 channel facts. |
| `GET` | `/v1/integrations/mcp/status` | Verified MCP service state. |
| `GET` | `/v1/integrations/mcp/tools` | Verified MCP tool inventory. |
| `GET` | `/v1/auth/wallet/me` | Current signed wallet-session identity. |
| `GET` | `/v1/cases/{case_id}` | Saved case record. |
| `GET` | `/v1/cases/{case_id}/evidence` | Evidence records for a case. |
| `GET` | `/v1/anchors/{manifest_root}` | Public HSK anchor lookup. |

### Write endpoints

| Method | Endpoint | Used for |
| --- | --- | --- |
| `POST` | `/v1/claim-audit` | Audits a transaction/claim/subject input. |
| `POST` | `/v1/auth/wallet/challenge` | Creates a one-time wallet-signature challenge. |
| `POST` | `/v1/auth/wallet/verify` | Exchanges a signed challenge for a short-lived session. |
| `POST` | `/v1/web/investigations/wallet-flow` | x402-protected web wallet-flow investigation. |
| `POST` | `/v1/cases/{case_id}/anchor` | Anchors an existing case package when backend authorization is configured. |
| `POST` | `/v1/verify` | Verifies a packaged investigation artifact. |

The canonical backend API and its OpenAPI documentation live in the `v52-backend` repository. Keep TypeScript types and the backend response models aligned whenever the API evolves.

## x402 safety model

Vector52 uses a pay-per-request model rather than a prepaid balance in the browser.

| Control | Frontend behavior |
| --- | --- |
| Network allowlist | Accepts only Avalanche Fuji: `eip155:43113`. |
| Asset allowlist | Validates the asset address returned by backend capabilities. |
| Recipient allowlist | Validates the exact `pay_to` address returned by backend capabilities. |
| Amount ceiling | The requested payment must equal the announced atomic amount. |
| User authorization | The connected wallet displays the cryptographic payment authorization. |
| Settlement proof | Results are accepted only after the x402 client parses a `settled` payment result. |
| Agent keys | The MCP signer validates the policy locally; the PWA never receives its key. |

Testnet tokens and Fuji funds are for development/demo use only. A payment operation is never a guarantee that a forensic conclusion is correct, complete, or recoverable.

## Development

### Available commands

```bash
pnpm dev          # Start Vite on http://localhost:5173
pnpm typecheck    # Run TypeScript project build checks without emitting app output
pnpm test         # Run the Vitest suite once
pnpm test:watch   # Run Vitest interactively
pnpm build        # Type-check and build the production bundle
pnpm preview      # Serve the built bundle locally
```

### Testing approach

The test suite covers the API client boundary, form validation, wallet access states, paid wallet-flow behavior, the introduction experience, and core UI components. Tests run in `jsdom` with one worker for deterministic execution.

When changing a feature, verify the smallest relevant test first, then the complete checks:

```bash
pnpm typecheck
pnpm test
pnpm build
```

### UI and state conventions

- Keep API types in `src/domain/apiTypes.ts` and transport logic in `src/api/vector52Client.ts`.
- Preserve visible loading, error, warning, and `UNKNOWN` states. Do not use mock success responses in production UI paths.
- Keep wallet-session data in session storage only; it is not a wallet secret.
- Use the project’s accessible semantic buttons, labels, roles, and existing CSS system rather than introducing inaccessible click targets.
- Keep side effects cancellable with `AbortController` where a component or request lifecycle requires it.

## Deployment

### Vercel

The included `vercel.json` performs these rewrites:

```text
/healthz   → https://v52-backend.onrender.com/healthz
/v1/*      → https://v52-backend.onrender.com/v1/*
everything else → /index.html
```

Before production deployment:

1. Set `VITE_REOWN_PROJECT_ID` in the frontend deployment environment if Web Wallet is enabled.
2. Register the exact production origin in Reown Verify.
3. Keep `VITE_API_BASE_URL` empty when using the included same-origin rewrites.
4. Set `VITE_MCP_SERVER_URL` only to a public, non-secret MCP URL that matches the agent-service transport.
5. Configure the backend CORS allowlist and `V52_PUBLIC_ORIGIN` with the exact deployed frontend origin.
6. Deploy the backend before advertising an MCP service as ready.

### MCP integration deployment checklist

The frontend’s MCP panel becomes meaningful only after the backend has a real, reachable MCP deployment configured. On the backend, set a public MCP service URL (never `localhost` from a cloud deployment) and redeploy. Then verify, without making a payment:

```bash
curl https://v52-backend.onrender.com/v1/integrations/mcp/status
curl https://v52-backend.onrender.com/v1/integrations/mcp/tools
```

Expected behavior:

- status reports `READY` only after the backend verifies the real service;
- tools includes the required published tools, such as `vector52_status` and `vector52_wallet_flow`;
- the frontend does not present a service as ready merely because a URL was entered.

## Verification

Run all frontend checks from the repository root:

```bash
pnpm typecheck
pnpm test
pnpm build
```

For a manual smoke test:

1. Start the backend and frontend proxy, or use the configured deployed backend.
2. Visit `/app` and confirm the API status chip resolves honestly.
3. Test a wallet-map query with a public address and validate that displayed limits/warnings come from the response.
4. Open **Agent → MCP Agent** and confirm the rendered service state matches `/v1/integrations/mcp/status`.
5. With a funded **test-only** Fuji wallet, execute one controlled x402 flow and confirm the settlement receipt before trusting the rendered graph.

## Security boundaries

| Boundary | Responsibility |
| --- | --- |
| Browser | Renders the workspace; retains no private key; obtains only public capabilities; requires explicit wallet authorization. |
| Reown / connected wallet | Owns account selection, chain switching, and the payment signature. |
| Frontend session storage | Holds a short-lived backend access token, not a wallet key. |
| Backend | Owns provider credentials, validates authenticated requests, performs forensic acquisition, and exposes state through versioned HTTP APIs. |
| MCP local signer | Owns the agent’s burner-wallet key and enforces network, recipient, asset, amount, and host policy. |
| Payment facilitator | Verifies and settles the x402 authorization; it must not receive the user’s private key. |

Additional project rules:

- Never cache sensitive evidence packages in the service worker.
- Never label a payment, MCP call, HSK anchor, or provider result successful without a verifiable response.
- Never expose backend service credentials through `VITE_*` variables.
- Treat all user-entered wallet addresses, claims, and files as untrusted input; rely on backend validation as well as UI validation.
- Preserve warnings and provenance rather than compressing uncertainty into a confident AI statement.

## Troubleshooting

| Symptom | Likely cause | What to check |
| --- | --- | --- |
| API chip is offline | Vite cannot reach the proxy target or the backend is down. | Start the backend, check `VITE_API_PROXY_TARGET`, then request `/healthz`. |
| Wallet controls ask for configuration | Reown is not configured. | Add a public `VITE_REOWN_PROJECT_ID`, restart Vite, and register the app origin with Reown. |
| A wallet cannot pay | Wrong chain, missing Fuji AVAX/USDC, or backend capabilities are not ready. | Switch to Fuji, use test funds, and inspect `/v1/web/capabilities`. |
| MCP panel says `UNAVAILABLE` | The backend has no verified MCP URL or cannot reach it. | Configure the backend MCP URL with a real public deployment and inspect the status endpoint. |
| MCP panel says `READY` but the agent cannot connect | Client transport does not match the deployed service. | Use `--url` only for Streamable HTTP; use command/args for a local stdio server. |
| Payment result is rejected | Payment was not settled or did not match policy. | Inspect the exact 402/capability data; do not retry blindly. |
| Production deep links return 404 | The deployment is missing SPA fallback rewrites. | Deploy with the provided `vercel.json` or equivalent rewrite rules. |

## Related repositories

| Repository | Responsibility |
| --- | --- |
| `v52` | This frontend: product UI, PWA, web wallet flow, and MCP access surface. |
| `v52-backend` | Canonical FastAPI backend, evidence processing, API contracts, providers, authentication, x402 middleware, and HSK integration. |
| `v52-mcp` | Companion MCP server and signer policy used by external AI-agent clients. |
| `v52-onchain` | Smart-contract and on-chain integration work, including the HSK evidence registry. |

## Asset provenance

The banner and editorial illustrations are original Vector52 assets generated for the project. Asset provenance, hashes, intended usage, sponsor-mark attribution, and design references are recorded in [ASSETS.md](ASSETS.md).

## Product limits

Vector52 can help structure an investigation around observable on-chain activity. It cannot, by itself:

- identify a natural person behind an address;
- reliably traverse every privacy boundary or cross-chain abstraction;
- infer ownership, intent, or fraud from a single transaction;
- guarantee that assets can be recovered;
- replace legal, compliance, or professional investigative review.

Use it as an evidence-preserving analytical aid. Treat source quality, provider coverage, timing, and warnings as part of every conclusion.

---

Built for the Vector52 evidence-first forensic workflow.
