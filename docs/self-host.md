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
| `NEW_SESSIONS_PER_MINUTE` | Public mode only. The most new sessions one client address may open each minute, 1 to 10000. A request with no cookie and no key counts, and so does a key Comfy refuses. A request with no cookie that carries a key counts against that key at `SESSION_REQUESTS_PER_MINUTE`, so an API client or an MCP client is not held to this limit. Only a request the limits allow gets a session cookie. An IPv6 address counts by its /64. The default covers the few parallel requests of a first page load and several people behind one shared address, and holds one address to 30 new sessions a minute. | `30` |
| `ADDRESS_REQUESTS_PER_MINUTE` | Public mode only. The most requests one client address may send each minute across all its sessions and keys, 1 to 100000. An IPv6 address counts by its /64. The default lets 100 people behind one school or carrier address each poll a run once a second, and holds a client that keeps many cookies to the same total. | `6000` |
| `CLIENT_ADDRESS_HEADER` | A server on bun only. The header a proxy in front of the server writes the client's address into, such as `X-Real-IP`, so the address limits count each visitor and not the proxy. The proxy must overwrite that header, because the server trusts it. When the header holds a list, the server reads its last address. Empty, the server reads the address of the connection. | none |
| `SPEND_CAP_CREDITS` | Owner mode only. The most Comfy credits the host may spend from `COMFY_API_KEY`. A run past it is refused with a message that names the cap. | no cap |
| `SPEND_UNKNOWN_RUN_CREDITS` | Owner mode with a cap. The credits the cap counts for each output of a run whose cost is not read yet, 1 to 100000. | `100` |

`COMFY_API_KEY`, `COMFY_BASE_URL` and `PORT` are the same as on your machine. Public mode refuses `COMFY_API_KEY`, because each visitor brings their own.

## On Cloudflare

You need a Cloudflare account with Workers Paid and R2 enabled, and a workers.dev subdomain, which the Workers page of the dashboard sets. To put Rosesfield on rosesfield.com with a private owner link, run one command from the repository root:

```sh
bun run deploy --login --domain rosesfield.com --judge --cap <credits>
```

It runs these steps, and `--dry-run` prints them and runs none:

1. Builds the platform.
2. Runs wrangler with its config in a new temporary folder, through `HOME` and `XDG_CONFIG_HOME`, so a wrangler sign-in already on your machine is never read or changed. It passes no `CLOUDFLARE_`, `CF_` or `WRANGLER_` variable of yours, except `CLOUDFLARE_ACCOUNT_ID` from `--account`, and reads no `.env` file of yours.
3. Runs `wrangler login`. Your browser opens, and you sign in to the account you deploy to.
4. Runs `wrangler whoami --json` and prints the account name and id. You type `yes` to deploy there, and any other answer stops the run before anything is created. With `--account <id>`, the run asks nothing when the sign-in reaches that account, and stops when it does not. When the sign-in reaches more than one account, `--account` is needed.
5. Creates what is missing and skips what exists: the R2 bucket `rosesfield-assets`, the D1 database `rosesfield` and its migrations. Wrangler 4 finds the database by its name, so no database id is written into `services/gateway/wrangler.jsonc`.
6. Deploys public mode on `--domain`. Its workers.dev address keeps answering.
7. Sets `SESSION_SECRET` when `wrangler secret list` does not show it. The secret is 32 random bytes from a cryptographic source, handed to `wrangler secret put` on its stdin. It is never printed and never written to a file. When `wrangler secret list` fails, the run stops rather than replace a secret that may exist.
8. With `--judge`, does the same for the owner link: the bucket `rosesfield-judge-assets`, the database `rosesfield-judge`, a deploy with `SPEND_CAP_CREDITS` set to `--cap <credits>`, and an `OWNER_TOKEN` made like `SESSION_SECRET`. The owner link, `https://rosesfield-judge.<your subdomain>.workers.dev/#token=<OWNER_TOKEN>`, is printed once, right after the token is set, so a later failure loses no token. Keep it. When `COMFY_API_KEY` is not set yet, wrangler asks you for it, and you paste your Comfy key at its prompt. `--login --judge` refuses to run without `--cap`.
9. Checks the live address: `/`, `/api/runs` and `/privacy` answer 200. The owner link's `/api/runs` answers 401 without its token and 200 with it, and its `/api/account` reports the cap you chose. A new domain can take a few minutes to answer, so each check tries for 3 minutes.
10. Signs out with `wrangler logout` and deletes the temporary folder, even when a step fails, and when Ctrl-C, a closed terminal or a stop signal ends the run, through SIGINT, SIGHUP or SIGTERM. If the sign-out fails, the run says so in capitals and names https://dash.cloudflare.com/profile, where you revoke the wrangler sign-in.

The prompts are wrangler's and the run's own: the browser sign-in, the `yes` for the account, and the Comfy key when the owner link has none. A later run finds `OWNER_TOKEN` set, keeps it, and prints the link without it. Without `--judge` and `--cap`, the command deploys public mode only. Without `--domain`, it answers on workers.dev only.

`bun run deploy --login --local` runs the same steps in wrangler's local runtime, on `--port`, with no sign-in. It starts each Worker, checks it, stops it and deletes its folder. A stand-in takes the place of the Comfy key, with an engine address that refuses every call.

### With a sign-in you already have

`bun run deploy` without `--login` uses the wrangler sign-in on your machine. Create the R2 bucket and the secret once.

```sh
bunx wrangler r2 bucket create rosesfield-assets --cwd services/gateway
bunx wrangler secret put SESSION_SECRET --cwd services/gateway
bun run deploy
```

`bun run deploy` builds the platform, creates the D1 database `rosesfield` when it does not exist, applies its migrations and deploys the Worker of `services/gateway/wrangler.jsonc` in public mode. `--domain <host>` also puts it on a domain of your account, such as rosesfield.com, and its workers.dev address keeps answering. `--dry-run` prints each step and runs none. `--local` runs the same deployment in wrangler's local runtime, with `--env-file <file>` for its settings.

The Worker keeps rows in D1 and bytes in the R2 bucket `rosesfield-assets`, and an hourly cron deletes what public mode no longer keeps.

### A private owner link

`bun run deploy --judge` deploys the Worker's `judge` environment: owner mode on one Comfy key, with a spend cap of 800 credits set by its `SPEND_CAP_CREDITS`, or the cap `--cap <credits>` names. Use it to let a few people you choose run Rosesfield on your key. Set its bucket and secrets first, or let `--login --judge` set them.

```sh
bunx wrangler r2 bucket create rosesfield-judge-assets --cwd services/gateway
bunx wrangler secret put OWNER_TOKEN --env judge --cwd services/gateway
bunx wrangler secret put COMFY_API_KEY --env judge --cwd services/gateway
```

The link opens with its owner token in the address and shows what is left of its cap.

## On a server that runs bun

```sh
bun install
bun run build
MODE=public SESSION_SECRET=<32 characters or more> HOST=0.0.0.0 bun run --filter @rosesfield/gateway start
```

The server serves the built platform and the API from one address, and prints its mode when it starts. Put it behind a proxy that serves HTTPS. Behind a proxy, the address limits see the proxy's address and count every visitor in one slot, unless `CLIENT_ADDRESS_HEADER` names the header the proxy writes the client's address into.

## Explore

Explore lists the shared results you choose. `bun scripts/deploy/explore.ts <share id>` adds one, and `--remove` takes it off. Name the database with `--remote` for the Cloudflare deployment, `--local` for wrangler's local runtime, or `--data-dir <folder>` for a server on bun.
