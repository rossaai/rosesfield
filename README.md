<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="apps/platform/public/lockup-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="apps/platform/public/lockup-light.svg">
    <img alt="Rosesfield" src="apps/platform/public/lockup-light.svg" height="64">
  </picture>
</p>

# Rosesfield

Make images and video in one place. Every app shares one library and runs on your key.

Rosesfield is an entry to the [Comfy open-source app challenge](https://comfy.org/open-source-higgsfield), #OpenSourceHiggsfield.

<a href="docs/media/video-seedance-kite.mp4"><img alt="A red kite over a green hill at dawn, made in Rosesfield's Video app" src="docs/media/video-seedance-kite.webp" width="640"></a>

One run of the Video app on 2026-10-19: Seedance 1.0 Pro Fast, 480p, 5 seconds, from a start image, 10.34 credits.

**Try it at [rosesfield.com](https://rosesfield.com).**

[![GitHub stars](https://img.shields.io/github/stars/rossaai/rosesfield?style=social)](https://github.com/rossaai/rosesfield/stargazers)

## Start in three steps

1. Make a Comfy key on [Comfy's key page](https://platform.comfy.org/profile/api-keys). Every run spends credits from your own Comfy account.
2. Open [rosesfield.com](https://rosesfield.com), or run it on your machine.
3. Paste your key in Settings.

## Run it on your machine

You need [bun](https://bun.sh) 1.4.3 and Node 22 or 24.

```sh
git clone https://github.com/rossaai/rosesfield.git
cd rosesfield
bun install
bun run start
```

Open `http://127.0.0.1:8787` and paste your Comfy key in Settings. It needs no setting.

You can set three optional settings in a `.env` file, as `.env.example` shows:

| Setting | What it sets |
|---|---|
| `COMFY_API_KEY` | Your Comfy key, so you do not paste it in Settings. |
| `COMFY_BASE_URL` | The address of comfy-api-proxy in front of your own ComfyUI, per [docs/stack.md](docs/stack.md). |
| `PORT` | The port the server listens on. The default is 8787. |

Every other value has a default in code.

## What was proven live

Each row counts the paid runs of one area in the running app on Comfy, from the credit ledger of the proof runs. The credits are Comfy credits, read from Comfy's balance before and after each run.

| Area | Proven models | Date | Runs | Credits |
|---|---|---|---|---|
| Image | Luma Photon Flash 1, FLUX 3 Image, GPT Image 2.5 Flare, Krea 2 Medium Turbo, Grok Imagine Image, Kling Image O1, Seedream 5.0 Flash, and the graphs Z-Image Turbo, FLUX.2 Klein 4B and Qwen Image 2512 | 2026-10-19 | 32 | about 117 |
| Video | H3 Max Turbo, Seedance 1.0 Pro Fast, and the LTX 2.5 graphs from text and from a start frame | 2026-10-19 | 7 | about 74 |
| Effects | the Effects graph on LTX 2.5, with its last frame from Qwen Image Edit 2511 or FLUX.2 Klein 4B | 2026-10-19 and 2026-10-21 | 70 | 517 |
| Background removal | the BiRefNet graph | 2026-10-19 | 1 | 6.73 |
| Edit | the Qwen Image Edit 2511 graph | 2026-10-21 | 1 | 12.35 |
| Video edit | the BiRefNet background, FILM frame rate and LTX 2.3 reframe graphs | 2026-10-21 | 3 | 12.56 |

- Six of those runs left no output in Rosesfield. Comfy refused two Image runs at submit, before any charge. Three runs failed in Rosesfield after Comfy made the output, and each cause is fixed. One Effects run failed in Comfy, which charged nothing.
- Three ledger rows hold an estimate instead of a reading: one Image run of FLUX.2 Klein 4B and one of Kling Image O1, whose balance readings held another run, and one Video run of LTX 2.5 that failed before its reading. So Image and Video show about.
- Every Effects run of 2026-10-21 made a video, and none of the 15 met every criterion of its effect yet.
- The agent has no live turn on the ledger yet. The other apps have no live run yet.

## Docs

- [docs/models.md](docs/models.md) says how each app's model list is read from Comfy, and lists the licence of each graph Rosesfield ships.
- [docs/self-host.md](docs/self-host.md) puts Rosesfield on a host other people reach, such as Cloudflare, with its settings.
- [docs/architecture.md](docs/architecture.md) says where the code goes and how a run moves.
- [docs/stack.md](docs/stack.md) lists the packages, the Comfy Router, the Comfy API v2 and the agent's model.
- [workflows/README.md](workflows/README.md) describes the ComfyUI graphs and how to open them in ComfyUI.

## Use it from Claude or your own code

Each app is an MCP tool at `/mcp` and an API route at `POST /api/apps/<app-id>/runs`. The Connect screen has the setup steps for Claude, ChatGPT and any MCP client.

```sh
curl -X POST http://127.0.0.1:8787/api/apps/image/runs \
  -H "content-type: application/json" \
  -H "Idempotency-Key: my-first-run" \
  -d '{"inputs":{"prompt":"A red bicycle leans against a white wall."}}'
```

The command starts a run and answers with its id. `GET /api/runs` lists your runs.

## Check a change

```sh
bun run gate
```

The gate runs `catalog:sync`, `generated:check`, `copy:check`, `typecheck`, `lint` and `test`.

## Licence

The code, the docs and the design tokens are under the [MIT licence](LICENSE). Each model's licence decides what you may do with what it makes, per [docs/models.md](docs/models.md). The Rosesfield name and logo are trademarks of ROSSA AI, LLC. [TRADEMARKS.md](TRADEMARKS.md) says how you can use them.

Every deployment serves a Privacy page at `/privacy` and a Terms page at `/terms`.

## Official source

The official repository is https://github.com/rossaai/rosesfield. A copy with a similar name is not official.

## Who makes it

Rosesfield is made and owned by ROSSA AI, LLC.

If your company wants to sponsor Rosesfield, write to partner@rosesfield.com.
