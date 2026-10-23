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

<a href="docs/media/rosesfield-demo.mp4"><img alt="The Rosesfield demo video. It opens on a photo beside the video one Effects run made from it." src="docs/media/rosesfield-demo.webp" width="720"></a>

The demo video, 87 seconds. It shows the areas, a model list, a finished run, Share, the credits, and how each run reaches Comfy. It was recorded on 2026-10-22 on a Rosesfield server on one machine, in owner mode, where the Comfy key stays on the server. Every result in it is a stored run, and the recording started no new run.

A [9:16 clip](docs/media/rosesfield-clip-9x16.mp4) of the Effects run is ready for a post.

**Try it at [rosesfield.com](https://rosesfield.com).**

[![GitHub stars](https://img.shields.io/github/stars/rossaai/rosesfield?style=social)](https://github.com/rossaai/rosesfield/stargazers)

## What each app made

Each clip shows the app's screen, then the result of one paid run on Comfy. Press a picture to play its clip. The Video run was made on 2026-10-19, the Effects run on 2026-10-21, and the others on 2026-10-22.

| Clip | The run |
|---|---|
| <a href="docs/media/apps/effects.mp4"><img alt="A photo of a woman in a camel coat, then the video Effects made from it" src="docs/media/apps/effects.webp" width="320"></a> | **Effects**, Still in a busy street. A photo becomes a video where she stands still and the street moves around her. The LTX 2.5 graph on Comfy Cloud, 1080p, 19.24 credits, made in 101 seconds. |
| <a href="docs/media/apps/image.mp4"><img alt="A woman in a red coat on a frozen lake at dawn while a whale breaks through the ice" src="docs/media/apps/image.webp" width="320"></a> | **Image**. One prompt: a woman in a red coat on a frozen lake at dawn, while a humpback whale breaks through the ice. GPT Image 2.5 Sunburst, high quality, 1536 by 1024, 12.54 credits, made in 49 seconds. |
| <a href="docs/media/apps/edit.mp4"><img alt="The frozen lake at night under the aurora, then a close-up of the same woman" src="docs/media/apps/edit.webp" width="320"></a> | **Edit**. A night version of the Image result becomes a close-up of the same woman facing the camera. GPT Image 2.5 Sunburst, 5.29 credits, made in 33 seconds. |
| <a href="docs/media/apps/upscale.mp4"><img alt="The Image result beside its upscaled copy" src="docs/media/apps/upscale.webp" width="320"></a> | **Upscale**. The Image result at twice its size, 3072 by 2048. The SeedVR2 3B graph, 2.00 credits, made in 20 seconds. |
| <a href="docs/media/apps/characters.mp4"><img alt="A half-body portrait of an older man in round gold glasses and a green velvet blazer" src="docs/media/apps/characters.webp" width="320"></a> | **Characters**. A character made from traits: an older man with short grey coily hair, round gold glasses and a green velvet blazer. The Z-Image Turbo graph, 1.81 credits, made in 44 seconds. |
| <a href="docs/media/apps/expand.mp4"><img alt="A tall street photo, then the same street widened to 16:9" src="docs/media/apps/expand.webp" width="320"></a> | **Expand**. A tall street photo widened to 16:9, with the street continued on both sides. The Qwen Image Inpaint graph, 3.66 credits, made in 37 seconds. |
| <a href="docs/media/apps/relight.mp4"><img alt="A portrait, then the same portrait lit by warm light from the left" src="docs/media/apps/relight.webp" width="320"></a> | **Relight**. A portrait relit with soft warm light from the left. Qwen Image Edit 2509 with the Relight LoRA, 17.03 credits, made in 88 seconds. |
| <a href="docs/media/apps/background-removal.mp4"><img alt="A sneaker on a stone block, then the sneaker alone on a transparent background" src="docs/media/apps/background-removal.webp" width="320"></a> | **Background removal**. A sneaker cut out onto a transparent background. The BiRefNet graph, 0.68 credits, made in 33 seconds. |
| <a href="docs/media/apps/video-edit.mp4"><img alt="A close-up clip of a woman's face at twice its frame rate" src="docs/media/apps/video-edit.webp" width="320"></a> | **Video edit**, frame rate. A clip at twice its frame rate, 48 frames a second, with its sound kept. The FILM graph, 3.31 credits, made in 28 seconds. |
| <a href="docs/media/video-seedance-kite.mp4"><img alt="A red kite over a green hill at dawn" src="docs/media/video-seedance-kite.webp" width="320"></a> | **Video**. A red kite over a green hill at dawn, from a start image. Seedance 1.0 Pro Fast, 480p, 5 seconds, 10.34 credits. |

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
- The agent has no live turn on the ledger yet.

From 2026-10-20 to 2026-10-22, eight showroom rounds made the examples above in the running app. Each row counts the paid runs of one app in those rounds. Kept counts the results that a judge who wrote none of the prompts kept. A run made outside the rounds, such as a builder's live check, is not counted.

| App | Models | Runs | Credits | Kept |
|---|---|---|---|---|
| Image | Z-Image Turbo, Seedream 5.0 Flash, Qwen Image 2512, GPT Image 2.5 Sunburst | 82 | 252.64 | 17 |
| Video | LTX 2.5, H3 Max Turbo, Grok Imagine Video 1.5 | 7 | 295.19 | 0 |
| Lip sync | LTX 2.3, Kling Videos Avatar Image2video | 3 | 126.99 | 0 |
| Upscale | SeedVR2 3B | 3 | 38.44 | 1 |
| Edit | Qwen Image Edit 2511, GPT Image 2.5 Sunburst | 3 | 38.35 | 1 |
| Storyboard | GPT Image 2.5 Sunburst | 6 | 28.28 | 0 |
| Try-on | Qwen Image Edit 2511 | 1 | 25.82 | 0 |
| Ads | Qwen Image Edit 2511, GPT Image 2.5 Sunburst | 2 | 21.21 | 0 |
| Relight | Qwen Image Edit 2509 with the Relight LoRA | 1 | 17.04 | 1 |
| Motion | LTX 2.3 with its control LoRA | 1 | 14.57 | 0 |
| Audio | Chatterbox, MiniMax Music 3, Eleven V4 Turbo | 4 | 14.11 | 0 |
| Angles | Qwen Image Edit 2511 | 2 | 13.19 | 0 |
| Shot | LTX 2.5 | 1 | 11.05 | 0 |
| Video edit | FILM, LTX 2.5 | 2 | 8.59 | 1 |
| Layers | Qwen Image Layered | 1 | 7.93 | 0 |
| Expand | Qwen Image Inpaint | 1 | 3.66 | 1 |
| Characters | Z-Image Turbo | 1 | 1.81 | 1 |
| Background removal | BiRefNet | 1 | 0.68 | 1 |

- The 122 runs cost 919.55 credits by their rows. Rounds one to six read each run's credits from Comfy's balance before and after it. Rounds seven and eight read each run's price in History, and Comfy's balance where History holds no price: the six Storyboard keyframes and one failed Upscale run that Comfy charged. Those rows sum to 0.01 credits less than Comfy's balance fell over the two rounds.
- Every video model given an action changed the person or failed the action, so no Video, Lip sync, Motion or Shot result was kept yet.
- Two Motion runs failed with no charge and one Eleven V4 Turbo run was refused before any job. None of the three is counted.
- Headshots, Remake and 3D have no run in these rounds.

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
