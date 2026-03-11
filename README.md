# Hako Integration Example

`hako-integration-example` is a public Node.js and TypeScript CLI that demonstrates how a partner can integrate with the Hako Integration API using [`viem`](https://viem.sh/).

It is designed for partner onboarding first:
- safe read-only API checks before any live transaction
- compact high-level commands for the full deposit and withdraw flow
- clear examples of what the partner backend does vs what the wallet signs or sends

Full docs: [Gitbook](https://hako.gitbook.io/docs/integration/getting-starting)

## What This Repo Covers

- strategy discovery with `GET /v1/strategy`
- deposit and withdraw quotes
- live deposit execution with approval + report flow
- live withdraw execution with typed-data signing + authorize flow
- action inspection and polling
- current position inspection

## Requirements

- Node.js 20 or newer
- A Hako Integration API base URL
- A partner API key for authenticated commands
- A funded EVM wallet private key only for live signing or sending commands

## Install

```bash
npm install
cp .env.example .env
```

Recommended production value:

```bash
HAKO_API=https://api.hakolabs.app/v1
```

## Environment

Required variables:

- `HAKO_API`
  Accepts either the API origin, such as `https://api.hakolabs.app`, or a URL that already includes `/v1`.
- `PARTNER_KEY`
  Required for authenticated partner commands such as quotes, positions, and actions.
- `PRIVATE_KEY`
  Required only for commands that derive a wallet address automatically or sign or send transactions.

Optional RPC overrides:

- `RPC_URL_BASE`
- `RPC_URL_ETHEREUM`
- `RPC_URL_POLYGON`
- `RPC_URL_ARBITRUM`
- `RPC_URL_OPTIMISM`

If an RPC override is not set, the CLI falls back to the default RPC URL from the matching `viem` chain definition.

## 5-Minute Onboarding Path

Start with safe commands first:

1. Run a connectivity and auth check.

```bash
npm run doctor
```

Example output:

```text
Hako Integration Example doctor
- Raw HAKO_API: https://api.hakolabs.app/v1
- Normalized API base URL: https://api.hakolabs.app/v1
- Public health check: ok (request 11111111-1111-4111-8111-111111111111)
- Public strategy check: ok (1 strategies: stable_vault) (request 22222222-2222-4222-8222-222222222222)
- Authenticated API check: ok for 0x1234...abcd (0 position items) (request 33333333-3333-4333-8333-333333333333)
- Derived wallet address: 0x1234567890abcdef1234567890abcdef12345678
```

2. Inspect the available strategy.

```bash
npm run strategy:list
```

Example output:

```text
Available strategies:
- stable_vault: Stable Vault
  APY: 8.27% | TVL: $38.51
  Input tokens: USDC, USDT, DAI
  Entrypoints: base (home), arbitrum, ethereum, optimism, polygon
Request ID: 44444444-4444-4444-8444-444444444444
```

3. Create a quote before any live transaction.

```bash
npm run quote:deposit -- --chain base --token USDC --amount 1 --address 0xYourWallet
npm run quote:withdraw -- --chain base --token USDC --amount 1 --address 0xYourWallet
```

4. Only then try a live transaction flow.

```bash
npm run deposit -- --chain base --token USDC --amount 1
npm run withdraw -- --chain base --token USDC --amount 1
```

## Command Environment Matrix

| Command | `HAKO_API` | `PARTNER_KEY` | `PRIVATE_KEY` | Notes |
| --- | --- | --- | --- | --- |
| `doctor` | required | optional | optional | Runs public checks always; authenticated and wallet checks only if those env vars are present |
| `strategy:list` | required | optional | not required | Public discovery command |
| `quote:deposit` | required | required | optional | Use `--address` to avoid needing `PRIVATE_KEY` |
| `quote:withdraw` | required | required | optional | Use `--address` to avoid needing `PRIVATE_KEY` |
| `position` | required | required | optional | Use `--address` to avoid needing `PRIVATE_KEY` |
| `action:get` | required | required | not required | Useful for support or backend-side tracking |
| `action:watch` | required | required | not required | Useful for support or backend-side tracking |
| `deposit` | required | required | required | Sends real transactions |
| `withdraw` | required | required | required | Signs typed-data and authorizes a real withdrawal |

## Canonical Defaults and Chain Names

Default onboarding values:

- strategy: `stable_vault`
- chain: `base`
- token: `USDC`

Supported chain names:

- `ethereum`
- `polygon`
- `base`
- `arbitrum`
- `optimism`

## Command Reference

### `doctor`

Safe connectivity and onboarding check:

```bash
npm run doctor
```

### `strategy:list`

List current partner-facing strategy metadata:

```bash
npm run strategy:list
npm run strategy:list -- --json
```

### `quote:deposit`

Create a deposit quote.

If `PRIVATE_KEY` is not set, pass `--address`.

```bash
npm run quote:deposit -- --chain base --token USDC --amount 1 --address 0xYourWallet
```

### `quote:withdraw`

Create a withdrawal quote.

If `PRIVATE_KEY` is not set, pass `--address`. If `--receiver` is omitted, the receiver defaults to the same address used for the quote.

```bash
npm run quote:withdraw -- --chain base --token USDC --amount 1 --address 0xYourWallet
```

### `deposit`

Run the live deposit flow:

1. create deposit action
2. send approval if required
3. send deposit transaction
4. wait for 1 confirmation
5. report the final tx hash

```bash
npm run deposit -- --chain base --token USDC --amount 25
```

Example output:

```text
Deposit action created: 55555555-5555-4555-8555-555555555555
- External ID: showcase-deposit-20260307120000-abcdef12
- Approval tx hash: 0xaaaa...
- Deposit tx hash: 0xbbbb...
- Report status: ok
- Watch status: npm run action:watch -- --action-id 55555555-5555-4555-8555-555555555555
```

### `withdraw`

Run the live withdrawal flow:

1. create withdraw action
2. parse typed-data authorization payload
3. sign typed-data with `viem`
4. authorize the action

```bash
npm run withdraw -- --chain base --token USDC --amount 10 --receiver 0xYourReceiver
```

Example output:

```text
Withdraw action created: 66666666-6666-4666-8666-666666666666
- External ID: showcase-withdraw-20260307120000-fedcba98
- Receiver: 0xYourReceiver
- Relay tx hash: 0xcccc...
- Expires at: 2026-03-07T13:00:00.000Z
- Watch status: npm run action:watch -- --action-id 66666666-6666-4666-8666-666666666666
```

### `action:get`

Fetch one action in a partner-friendly summary:

```bash
npm run action:get -- --action-id <ACTION_ID>
```

### `action:watch`

Poll until the action reaches a terminal state:

```bash
npm run action:watch -- --action-id <ACTION_ID> --interval-ms 5000 --timeout-ms 300000
```

Example output:

```text
Action 55555555-5555-4555-8555-555555555555 finished with status COMPLETED.
Observed status changes:
- 2026-03-07T12:01:00.000Z: NEW
- 2026-03-07T12:01:10.000Z: PROCESSING
- 2026-03-07T12:05:42.000Z: COMPLETED
```

### `position`

Inspect the current strategy position and pending actions.

If `PRIVATE_KEY` is not set, pass `--address`.

```bash
npm run position -- --address 0xYourWallet
```

## Who Does What in the Flow

Partner backend:

1. creates quotes
2. creates actions
3. for deposits, reports the final tx hash
4. for withdrawals, submits the user signature
5. polls action state

Wallet or signer:

1. sends approval and deposit transactions
2. signs the withdrawal typed-data payload

This example combines those responsibilities into a single CLI for learning and testing, but the commands still map to the real API boundaries.

## Troubleshooting

### Wrong hostname

Use `api.hakolabs.app`, not `app.hakoapp.app`.

### `.app` domain with `http`

Use `https://api.hakolabs.app/v1`. The CLI normalizes `.app` domains to HTTPS, but the recommended value is already HTTPS.

### Missing `PARTNER_KEY`

Partner-authenticated commands such as quotes, positions, and action lookups require `PARTNER_KEY`.

### Missing `PRIVATE_KEY`

Use `--address` for read-only commands such as `quote:deposit`, `quote:withdraw`, and `position`. Live `deposit` and `withdraw` still require `PRIVATE_KEY`.

### Unsupported token or chain

Start with:

```bash
npm run strategy:list -- --json
```

That will show the strategy input tokens and entrypoint networks supported by the API.

### Insufficient funds

`deposit` and `withdraw` are live operations. Use a funded wallet and prefer a dedicated low-balance partner demo wallet.

### Action stays non-terminal

Use:

```bash
npm run action:get -- --action-id <ACTION_ID>
npm run action:watch -- --action-id <ACTION_ID>
```

`PAYOUT_COMPLETED` is an intermediate withdrawal state. `action:watch` only stops on `COMPLETED`, `FAILED`, or `CANCELLED`.

## Scripts

- `npm run doctor`
- `npm run strategy:list`
- `npm run quote:deposit -- --chain <chain> --token <token> --amount <amount> [--address <address>]`
- `npm run deposit -- --chain <chain> --token <token> --amount <amount>`
- `npm run action:get -- --action-id <uuid>`
- `npm run action:watch -- --action-id <uuid>`
- `npm run position -- [--address <address>]`
- `npm run quote:withdraw -- --chain <chain> --token <token> --amount <amount> [--address <address>]`
- `npm run withdraw -- --chain <chain> --token <token> --amount <amount>`
- `npm run verify`
