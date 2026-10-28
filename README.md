<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="apps/platform/public/lockup-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="apps/platform/public/lockup-light.svg">
    <img alt="Rosesfield" src="apps/platform/public/lockup-light.svg" height="64">
  </picture>
</p>

<h1 align="center">Open-source Higgsfield alternative, built with ComfyUI</h1>

<p align="center">27 apps that run on your own Comfy key.</p>

<p align="center">
  <a href="https://rosesfield.com"><b>Open rosesfield.com</b></a>&emsp;
  <a href="#start">Run it on your machine</a>&emsp;
  <a href="#rosesfield-and-higgsfield-app-by-app">Compare it with Higgsfield</a>
</p>

<p align="center">
  <a href="https://github.com/rossaai/rosesfield/stargazers"><img alt="GitHub stars" src="https://img.shields.io/github/stars/rossaai/rosesfield?style=social"></a>
</p>

> [!NOTE]
> Rosesfield is an entry to Comfy's [Open Source Higgsfield challenge](https://comfy.org/open-source-higgsfield), #OpenSourceHiggsfield. It is not made by, affiliated with or endorsed by Higgsfield.

<p align="center">
  <a href="docs/media/rosesfield-film.mp4"><img alt="The Rosesfield launch film. A red rose growing through ice, open in the Image app's viewer, over a field of roses." src="docs/media/rosesfield-film.webp" width="720"></a>
</p>

<p align="center">The launch film, 38 seconds. Every result in it is a real run on Comfy.</p>

## Start

1. Make a key on [Comfy's key page](https://platform.comfy.org/profile/api-keys).
2. Open [rosesfield.com](https://rosesfield.com) and paste it in Settings.

Your Comfy key is the only sign-in, and each run spends credits from your own Comfy account.

Or run it on your machine with [bun](https://bun.sh):

```sh
git clone https://github.com/rossaai/rosesfield.git && cd rosesfield
bun install
bun run start
```

Open `http://127.0.0.1:8787` and paste your key in Settings.

## Made with Rosesfield

<table>
  <tr>
    <td align="center"><a href="docs/media/apps/effects.mp4"><img alt="A photo of a woman in a camel coat, then the video Effects made from it" src="docs/media/apps/effects.webp" width="260"></a><br><b>Effects</b></td>
    <td align="center"><a href="docs/media/video-seedance-kite.mp4"><img alt="A red kite over a green hill at dawn" src="docs/media/video-seedance-kite.webp" width="260"></a><br><b>Video</b></td>
    <td align="center"><a href="docs/media/apps/image.mp4"><img alt="A woman in a red coat on a frozen lake at dawn while a whale breaks through the ice" src="docs/media/apps/image.webp" width="260"></a><br><b>Image</b></td>
  </tr>
  <tr>
    <td align="center"><a href="docs/media/apps/edit.mp4"><img alt="The frozen lake at night under the aurora, then a close-up of the same woman" src="docs/media/apps/edit.webp" width="260"></a><br><b>Edit</b></td>
    <td align="center"><a href="docs/media/apps/upscale.mp4"><img alt="The Image result beside its upscaled copy" src="docs/media/apps/upscale.webp" width="260"></a><br><b>Upscale</b></td>
    <td align="center"><a href="docs/media/apps/relight.mp4"><img alt="A portrait, then the same portrait lit by warm light from the left" src="docs/media/apps/relight.webp" width="260"></a><br><b>Relight</b></td>
  </tr>
  <tr>
    <td align="center"><a href="docs/media/apps/expand.mp4"><img alt="A tall street photo, then the same street widened to 16:9" src="docs/media/apps/expand.webp" width="260"></a><br><b>Expand</b></td>
    <td align="center"><a href="docs/media/apps/characters.mp4"><img alt="A half-body portrait of an older man in round gold glasses and a green velvet blazer" src="docs/media/apps/characters.webp" width="260"></a><br><b>Characters</b></td>
    <td align="center"><a href="docs/media/apps/video-edit.mp4"><img alt="A close-up clip of a woman's face at twice its frame rate" src="docs/media/apps/video-edit.webp" width="260"></a><br><b>Video edit</b></td>
  </tr>
  <tr>
    <td align="center" colspan="3"><a href="docs/media/apps/three-d.mp4"><img alt="A red rose with two leaves on a round base, turning in the 3D app's viewer" src="docs/media/apps/three-d.webp" width="260"></a><br><b>3D</b></td>
  </tr>
</table>

Press a picture to play its clip. Each one is a paid run in the running app, made from 2026-10-19 to 2026-10-28.

24 of Higgsfield's 35 products have a Rosesfield app that does the same job, and Rosesfield adds Music, Sound effects and 3D. [See them side by side](#rosesfield-and-higgsfield-app-by-app).

---

## In detail

This part is for reviewers and AI agents: the facts, the comparison, how Rosesfield is built with ComfyUI, and what was proven.

| | |
|---|---|
| Apps | 27, for images, video, audio, characters and 3D |
| ComfyUI workflows | 32 graphs. 31 load open weights, and one runs Comfy's Meshy partner node. Each is an API file the app runs and a UI file that opens in ComfyUI and in App Mode |
| Hosted models | every Comfy Router model of each app's task, read live from Comfy |
| Where a run happens | Comfy Router, Comfy Cloud, or your own ComfyUI through comfy-api-proxy |
| Sign-in | one Comfy key, with no account |
| Ways in | the web app, installable on a phone, an MCP server with one tool per app, an HTTP API with one route per app, and an agent that runs the apps for you |
| Hosts | your machine with bun, or Cloudflare Workers |
| Price | Comfy credits, shown on Generate when the price is known, and the real cost in History after each run |
| Proof | 114 proof runs and 122 showroom runs on Comfy, counted in [What was proven live](#what-was-proven-live) |
| Higgsfield products with a Rosesfield app | 24 of 35 |
| Licence | MIT |

## Rosesfield and Higgsfield, app by app

Higgsfield's products as higgsfield.ai listed them on 2026-10-17, beside the Rosesfield app that does the same job. Rosesfield runs open-weights models and the models Comfy hosts. It does not run Higgsfield's own models.

| Higgsfield | Rosesfield | What you do in Rosesfield |
|---|---|---|
| Image | Image | Describe an image and get up to 4. |
| Video | Video | Turn a prompt or your images into a video. |
| Genjutsu | Motion, Swap a character | Put the person in your photo in place of the person in a clip, at the same moments. The scene comes from your photo. |
| Motion Control | Motion, Move a photo | Move a photo with the motion of a clip. |
| Katana | Remake | Rebuild an edit with your character and the same cuts. |
| Effects | Effects | Pick an effect, add a photo, and get a short clip. |
| Cinema Studio | Shot | Write a scene and choose how the camera shoots it. |
| Lipsync Studio | Lip sync | Add a face and a voice track, and get a talking video. |
| Popcorn storyboard | Storyboard | Write up to 8 scenes and get one keyframe for each. |
| Video edit tools | Video edit | Extend a clip, reframe it, remove its background or raise its frame rate. |
| Upscale | Upscale | Make your image or video 2 or 4 times larger. |
| Audio | Speech, Voice clone, Voice change | Turn text into a voice, speak in the voice of a short recording, or make one recording speak in another voice. |
| AI Influencer, Soul ID | Characters | Make a character from photos or traits, then use it in any app. A character is a set of photos, and no model is trained. |
| Ads Studio, Marketing Studio | Ads | Add photos of a product and get product shots or ads. |
| Higgsfield Layers | Layers, Edit | Split an image into layers and edit one, or change a photo by saying what should change. |
| Apps catalog | Angles, Expand, Relight, Try-on, Remove background, Headshot | See a subject from other sides, extend a photo, change its light, put on the clothes from another photo, cut out the subject, or make a headshot. |
| Supercomputer | Agent | Ask in chat, and the agent runs the apps for you. It can ask before each run. |
| MCP, ChatGPT plugin | MCP server | Every app is a tool at `/mcp`. Connect has the steps for Claude, ChatGPT and other clients. |
| API | HTTP API | Every app is a route, `POST /api/apps/<app-id>/runs`. |
| Web app, Mobile app | The web app | One app for a computer and a phone, installable from the browser. |

Rosesfield also has three apps the list above does not: Music makes a track from a description, with your lyrics if you have them. Sound effects makes a sound from a description. 3D makes a GLB model from a description or a photo. Rosesfield runs on your own ComfyUI or your own host too, and every graph is a workflow you can open and change.

Not in Rosesfield: the course, contests, the community feed, plugins for desktop editors, the node canvas, series and films, the app builder, team chat, games, motion graphics for desktop editors, the browser extension, speech translation, and Higgsfield's own models, such as Soul. For a node canvas, open any workflow in `workflows/` in ComfyUI.

## Built with ComfyUI

Every run reaches Comfy through the Comfy SDK, `@comfyorg/sdk` 0.5.0, on one Comfy key.

| What runs | Where it runs | How Rosesfield calls it |
|---|---|---|
| Hosted models, every model Comfy publishes for the app's task | Comfy Router, `api.comfy.org` | the model's queued route |
| The 32 workflows in [`workflows/`](workflows/README.md) | Comfy Cloud, `cloud.comfy.org` | the Comfy API v2 |
| The open-weights workflows on your GPU | your own ComfyUI | comfy-api-proxy, set in Settings or by `COMFY_BASE_URL` |

- Each workflow ships as two files: the API file the app sends, and the UI file you open in ComfyUI. The UI file holds its App Mode setup, so it opens in App Mode with the inputs the app shows.
- Effects runs one LTX 2.5 graph, [`effects-ltx-2-5`](workflows/effects-ltx-2-5/README.md), and LTX 2.5 is its only video model.
- [docs/stack.md](docs/stack.md) lists every package and each call Rosesfield makes to Comfy.

## What each run made

The clips in [Made with Rosesfield](#made-with-rosesfield), with their models and costs, and one more. The Video run was made on 2026-10-19, the Effects run on 2026-10-21, the 3D run on 2026-10-28, and the others on 2026-10-22.

| App | The run |
|---|---|
| Effects | Still in a busy street. A photo becomes a video where she stands still and the street moves around her. The LTX 2.5 graph on Comfy Cloud, 1080p, 19.24 credits, made in 101 seconds. |
| Image | One prompt: a woman in a red coat on a frozen lake at dawn, while a humpback whale breaks through the ice. GPT Image 2.5 Sunburst, high quality, 1536 by 1024, 12.54 credits, made in 49 seconds. |
| Edit | A night version of the Image result becomes a close-up of the same woman facing the camera. GPT Image 2.5 Sunburst, 5.29 credits, made in 33 seconds. |
| Upscale | The Image result at twice its size, 3072 by 2048. The SeedVR2 3B graph, 2.00 credits, made in 20 seconds. |
| Characters | A character made from traits: an older man with short grey coily hair, round gold glasses and a green velvet blazer. The Z-Image Turbo graph, 1.81 credits, made in 44 seconds. |
| Expand | A tall street photo widened to 16:9, with the street continued on both sides. The Qwen Image Inpaint graph, 3.66 credits, made in 37 seconds. |
| Relight | A portrait relit with soft warm light from the left. Qwen Image Edit 2509 with the Relight LoRA, 17.03 credits, made in 88 seconds. |
| Remove background | A sneaker cut out onto a transparent background, [the clip](docs/media/apps/background-removal.mp4). The BiRefNet graph, 0.68 credits, made in 33 seconds. |
| Video edit | A clip at twice its frame rate, 48 frames a second, with its sound kept. The FILM graph, 3.31 credits, made in 28 seconds. |
| Video | A red kite over a green hill at dawn, from a start image. Seedance 1.0 Pro Fast, 480p, 5 seconds, 10.34 credits. |
| 3D | A sculpture of one open rose on a short stem with two leaves, from a description. Meshy 7.1, Art style Sculpture, 241.38 credits, made in 64 seconds. Rosesfield runs Meshy's preview mode, which makes the shape only, so the model came out white. Its colour was added after the run by a script that runs no model. |

The launch film shows a prompt in the Image app, the model picker, five results in their own viewers, the 27 apps, and how a Comfy key reaches Settings. It is edited from the app's own screens. Every result in it is a stored run, and its 3D rose is the coloured model above. Comfy's key page in it is redrawn, and no key appears.

The [87-second walkthrough](docs/media/rosesfield-demo.mp4) shows the areas, a model list, a finished run, Share, the credits, and how each run reaches Comfy. It was recorded on 2026-10-22 on a Rosesfield server on one machine, in owner mode, where the Comfy key stays on the server. Every result in it is a stored run, and the recording started no new run. A [9:16 clip](docs/media/rosesfield-clip-9x16.mp4) of the Effects run is ready for a post.

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
| Storyboard | GPT Image 2.5 Sunburst, Z-Image Turbo | 6 | 28.28 | 0 |
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

- The 122 runs cost 919.55 credits by their rows. Rounds one to six read each run's credits from Comfy's balance before and after it. Rounds seven and eight read each run's price in History, and Comfy's balance for the two Storyboard runs, whose hosted keyframes hold no price, and for one failed Upscale run that Comfy charged. Those rows sum to 0.01 credits less than Comfy's balance fell over the two rounds.
- Every video model given an action changed the person or failed the action, so no Video, Lip sync, Motion or Shot result was kept yet.
- Two Motion runs failed with no charge and one Eleven V4 Turbo run was refused before any job. None of the three is counted.
- Headshots, Remake and 3D have no run in these rounds.

## Settings

You need [bun](https://bun.sh) 1.4.3 and Node 22 or 24 to run Rosesfield on your machine. It needs no setting. You can set three optional settings in a `.env` file, as `.env.example` shows:

| Setting | What it sets |
|---|---|
| `COMFY_API_KEY` | Your Comfy key, so you do not paste it in Settings. |
| `COMFY_BASE_URL` | The address of comfy-api-proxy in front of your own ComfyUI, per [docs/stack.md](docs/stack.md). |
| `PORT` | The port the server listens on. The default is 8787. |

Every other value has a default in code.

## Use it from Claude or your own code

Each app is an MCP tool at `/mcp` and an API route at `POST /api/apps/<app-id>/runs`. The Connect screen has the setup steps for Claude, ChatGPT and any MCP client.

```sh
curl -X POST http://127.0.0.1:8787/api/apps/image/runs \
  -H "content-type: application/json" \
  -H "Idempotency-Key: my-first-run" \
  -d '{"inputs":{"prompt":"A red bicycle leans against a white wall."}}'
```

The command starts a run and answers with its id. `GET /api/runs` lists your runs.

## Docs

- [docs/models.md](docs/models.md) says how each app's model list is read from Comfy, and lists the licence of each graph Rosesfield ships.
- [docs/self-host.md](docs/self-host.md) puts Rosesfield on a host other people reach, such as Cloudflare, with its settings.
- [docs/architecture.md](docs/architecture.md) says where the code goes and how a run moves.
- [docs/stack.md](docs/stack.md) lists the packages, the Comfy Router, the Comfy API v2 and the agent's model.
- [workflows/README.md](workflows/README.md) describes the ComfyUI graphs and how to open them in ComfyUI.

## Check a change

```sh
bun run gate
```

The gate runs `catalog:sync`, `generated:check`, `copy:check`, `glob:check`, `motion:check`, `docs:check`, `typecheck`, `lint` and `test`.

## Licence

The code, the docs and the design tokens are under the [MIT licence](LICENSE). Each model's licence decides what you may do with what it makes, per [docs/models.md](docs/models.md). The Rosesfield name and logo are trademarks of ROSSA AI, LLC. [TRADEMARKS.md](TRADEMARKS.md) says how you can use them.

Higgsfield and the names of its products belong to their owner. Rosesfield names them only to compare, and it is not affiliated with or endorsed by Higgsfield.

Every deployment serves a Privacy page at `/privacy` and a Terms page at `/terms`.

## Official source

The official repository is https://github.com/rossaai/rosesfield. A copy with a similar name is not official.

## Who makes it

Rosesfield is made and owned by ROSSA AI, LLC.

If your company wants to sponsor Rosesfield, write to partner@rosesfield.com.
