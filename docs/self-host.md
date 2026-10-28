# Self-host

> How you put Rosesfield on a host other people reach, such as rosesfield.com, and the settings that host reads. On your own machine you need none of this, per the README.

## Two modes

| Mode | Who uses it | Whose key | Set with |
|---|---|---|---|
| public | anyone with the address | each visitor's own, pasted in Settings | `MODE=public` and `SESSION_SECRET` |
| owner | you, and whoever holds your owner token | yours, from `COMFY_API_KEY` | `OWNER_TOKEN`, and `COMFY_API_KEY` |

Public mode is how a host for strangers runs, per `docs/architecture.md` §Public mode. Owner mode is how the server runs on your machine, per `docs/architecture.md` §The owner lock.

## The settings of a host

Every setting below has a default in code, or is needed only in the mode it names. A server on your machine needs none of them.

| Setting | What it sets | Default |
|---|---|---|
| `MODE` | `owner` or `public` | `owner` |
| `SESSION_SECRET` | Public mode only, and needed there. Signs each visitor's session, at least 32 characters with no space. | none |
| `OWNER_TOKEN` | Owner mode. The token every request must carry as `Authorization: Bearer <token>`, at least 32 characters. Needed when the server answers beyond your machine. Public mode refuses it. | none |
| `HOST` | The address a server on bun listens on. A server that listens beyond `127.0.0.1` without `OWNER_TOKEN` refuses to start in owner mode. | `127.0.0.1` |
| `DATA_DIR` | The folder of a server on bun for its SQLite file and your assets, relative to `services/gateway`. | `./data` |
| `RETENTION_DAYS` | Public mode only. The days a visitor's work stays after their last visit, 1 to 365. | `30` |
| `SESSION_REQUESTS_PER_MINUTE` | Public mode only. The most requests one session may send each minute, 1 to 10000. | `600` |
| `NEW_SESSIONS_PER_MINUTE` | Public mode only. The most new sessions one client address may open each minute, 1 to 10000. A request that opens a session, or sends a key the host has not checked, counts. Only a request the limits allow gets a session cookie. An IPv6 address counts by its /64. The default covers the few parallel requests of a first page load and several people behind one shared address, and holds one address to 30 new sessions a minute. | `30` |
| `CLIENT_ADDRESS_HEADER` | A server on bun only. The header a proxy in front of the server writes the client's address into, such as `X-Real-IP`, so the address limits count each visitor and not the proxy. The proxy must overwrite that header, because the server trusts it. When the header holds a list, the server reads its last address. Empty, the server reads the address of the connection. | none |
| `SPEND_CAP_CREDITS` | Owner mode only. The most Comfy credits the host may spend from `COMFY_API_KEY`. A run past it is refused with a message that names the cap. | no cap |
| `SPEND_UNKNOWN_RUN_CREDITS` | Owner mode with a cap. The credits the cap counts for each output of a run whose cost is not read yet, 1 to 100000. | `100` |

`COMFY_API_KEY`, `COMFY_BASE_URL` and `PORT` are the same as on your machine. Public mode refuses `COMFY_API_KEY`, because each visitor brings their own.

## On Cloudflare

You need a Cloudflare account and `bunx wrangler login`. Create the R2 bucket once.

```sh
bunx wrangler r2 bucket create rosesfield-assets --cwd services/gateway
bunx wrangler secret put SESSION_SECRET --cwd services/gateway
bun run deploy
```

`bun run deploy` builds the platform, creates the D1 database `rosesfield` when it does not exist, applies its migrations and deploys the Worker of `services/gateway/wrangler.jsonc` in public mode. `--domain <host>` also puts it on a domain of your account, such as rosesfield.com, and its workers.dev address keeps answering. `--dry-run` prints each step and runs none. `--local` runs the same deployment in wrangler's local runtime, with `--env-file <file>` for its settings.

The Worker keeps rows in D1 and bytes in the R2 bucket `rosesfield-assets`, and an hourly cron deletes what public mode no longer keeps.

### A private owner link

`bun run deploy --judge` deploys the Worker's `judge` environment: owner mode on one Comfy key, with a spend cap of 800 credits set by its `SPEND_CAP_CREDITS`. Use it to let a few people you choose run Rosesfield on your key. Set its bucket and secrets first.

```sh
bunx wrangler r2 bucket create rosesfield-judge-assets --cwd services/gateway
bunx wrangler secret put OWNER_TOKEN --env judge --cwd services/gateway
bunx wrangler secret put COMFY_API_KEY --env judge --cwd services/gateway
```

The link opens with its owner token in the address and shows what is left of its cap. Change `SPEND_CAP_CREDITS` in `services/gateway/wrangler.jsonc` to set another cap.

## On a server that runs bun

```sh
bun install
bun run build
MODE=public SESSION_SECRET=<32 characters or more> HOST=0.0.0.0 bun run --filter @rosesfield/gateway start
```

The server serves the built platform and the API from one address, and prints its mode when it starts. Put it behind a proxy that serves HTTPS. Behind a proxy, the address limits see the proxy's address and count every visitor in one slot, unless `CLIENT_ADDRESS_HEADER` names the header the proxy writes the client's address into.

## Explore

Explore lists the shared results you choose. `bun scripts/deploy/explore.ts <share id>` adds one, and `--remove` takes it off. Name the database with `--remote` for the Cloudflare deployment, `--local` for wrangler's local runtime, or `--data-dir <folder>` for a server on bun.
