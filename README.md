<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="apps/platform/public/lockup-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="apps/platform/public/lockup-light.svg">
    <img alt="Rosesfield" src="apps/platform/public/lockup-light.svg" height="64">
  </picture>
</p>

<h1 align="center">Open-source Higgsfield alternative, built with ComfyUI</h1>

<p align="center">25+ apps that run on your own Comfy key.</p>

<p align="center">
  <a href="#start"><b>Run it on your machine</b></a>&emsp;
  <a href="#rosesfield-and-higgsfield-app-by-app">Compare it with Higgsfield</a>
</p>

<p align="center">
  <a href="https://github.com/rossaai/rosesfield/stargazers"><img alt="GitHub stars" src="https://img.shields.io/github/stars/rossaai/rosesfield?style=social"></a>
</p>

> [!NOTE]
> Rosesfield is an entry to Comfy's [Open Source Higgsfield challenge](https://comfy.org/open-source-higgsfield), #OpenSourceHiggsfield. It is not made by, affiliated with or endorsed by Higgsfield.

<p align="center">
  <img alt="The Rosesfield launch film, playing without sound. A prompt types into the Image app, a white goose in a red cape appears on a throne, and real results stream past the name." src="docs/media/film/rosesfield-film.webp" width="720">
</p>

<p align="center">The launch film, 38 seconds. Every result in it is a real run on Comfy. <a href="docs/media/film/rosesfield-film.mp4">Watch it with sound</a>.</p>

## Start

1. Make a key on [Comfy's key page](https://platform.comfy.org/profile/api-keys).
2. Run Rosesfield on your machine with [bun](https://bun.sh):

```sh
git clone https://github.com/rossaai/rosesfield.git && cd rosesfield
bun install
bun run start
```

Open `http://127.0.0.1:8787` and paste your key in Settings.

Your Comfy key is the only sign-in, and each run spends credits from your own Comfy account.

## Made with Rosesfield

<table>
  <tr>
    <td align="center"><img alt="A woman waters a garden with a hose, then the same photo where the water is a stream of orange and magenta petals" src="docs/media/examples/hose.webp" height="300"><br><b>Image, then Edit</b></td>
    <td align="center"><img alt="A man in a bucket hat runs toward the camera down a cobbled street, with two police officers behind him" src="docs/media/examples/motion.webp" height="300"><br><b>Motion</b></td>
    <td align="center"><img alt="A close-up of a brown eye, from a clip at twice its frame rate" src="docs/media/examples/video-edit.webp" height="300"><br><b>Video edit</b></td>
  </tr>
  <tr>
    <td align="center"><img alt="A white goose in a red velvet cape on a golden throne, in a candlelit hall where courtiers stand along a red carpet" src="docs/media/examples/video.webp" width="260"><br><b>Video</b></td>
    <td align="center"><img alt="A pink flamingo standing alone under a bus stop shelter at night, lit by a phone flash" src="docs/media/examples/image.webp" width="260"><br><b>Image</b></td>
    <td align="center"><img alt="A green and cream camper van, then the same van made as a cake with a wedge cut from its side" src="docs/media/examples/edit.webp" width="260"><br><b>Edit</b></td>
  </tr>
  <tr>
    <td align="center"><img alt="A honeybee on a red poppy, seen close" src="docs/media/examples/shot.webp" width="260"><br><b>Shot</b></td>
    <td align="center"><img alt="A cream ceramic jaguar head in flat grey light, then the same head lit orange from the left and magenta from the right" src="docs/media/examples/relight.webp" width="260"><br><b>Relight</b></td>
    <td align="center"><img alt="A man with the head of a brown hare, in an oatmeal cardigan, holding a basket of towels in a laundromat" src="docs/media/examples/characters.webp" width="260"><br><b>Characters</b></td>
  </tr>
  <tr>
    <td align="center"><img alt="A sunflower field where one flower faces the camera and the others face away, widened to 16:9" src="docs/media/examples/expand.webp" width="260"><br><b>Expand</b></td>
    <td align="center"><img alt="A detail of a chameleon's eye, from the 768 pixel photo beside the same detail from its copy at 1536 pixels" src="docs/media/examples/upscale.webp" width="260"><br><b>Upscale</b></td>
    <td align="center"><img alt="A glass perfume bottle among red and pink roses, then the same bottle alone on a transparent background" src="docs/media/examples/background-removal.webp" width="260"><br><b>Remove background</b></td>
  </tr>
</table>

Each clip plays on its own, without its sound. Each one is a paid run in the running app, made from 2026-10-22 to 2026-10-29.

Of the 36 Higgsfield products this README lists, 24 have a Rosesfield app that does the same job, and Rosesfield adds Music, Sound effects and 3D. [See them side by side](#rosesfield-and-higgsfield-app-by-app).

---

## In detail

This part is for reviewers and AI agents: the facts, the comparison, how Rosesfield is built with ComfyUI, and what was proven.

| | |
|---|---|
| Apps | 25+, for images, video, audio, characters and 3D |
| ComfyUI workflows | 30+ graphs. All but one load open weights, and one runs Comfy's Meshy partner node. Each is an API file the app runs and a UI file that opens in ComfyUI and in App Mode |
| Hosted models | every Comfy Router model of each app's task, read live from Comfy |
| Where a run happens | Comfy Router, Comfy Cloud, or your own ComfyUI through comfy-api-proxy |
| Sign-in | one Comfy key, with no account |
| Ways in | the web app, installable on a phone, an MCP server with one tool per app, an HTTP API with one route per app, and an agent that runs the apps for you |
| Hosts | your machine with bun, or Cloudflare Workers |
| Price | Comfy credits, shown on Generate when the price is known, and the real cost in History after each run |
| Proof | 114 proof runs and 122 showroom runs on Comfy, counted in [What was proven live](#what-was-proven-live) |
| Higgsfield products with a Rosesfield app | 24 of the 36 listed below |
| Licence | MIT |

## Rosesfield and Higgsfield, app by app

Higgsfield's products as higgsfield.ai listed them on 2026-10-17, beside the Rosesfield app that does the same job. Rosesfield runs open-weights models and the models Comfy hosts. It does not run Higgsfield's own models.

| Higgsfield | Rosesfield | What you do in Rosesfield |
|---|---|---|
| Image | Image | Describe an image and get up to 4. |
| Video | Video | Turn a prompt or your images into a video. |
| Genjutsu | Motion | Put the person in your photo in place of the person in a clip, at the same moments. The scene comes from your photo. |
| Motion Control | Motion | Move a photo with the motion of a clip. |
| Katana | Remake | Rebuild an edit with your character and the same cuts. |
| Effects | Motion, Library | Remix an example from the Library with your photo, and get a short clip. |
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
| The workflows in [`workflows/`](workflows/README.md) | Comfy Cloud, `cloud.comfy.org` | the Comfy API v2 |
| The open-weights workflows on your GPU | your own ComfyUI | comfy-api-proxy, set in Settings or by `COMFY_BASE_URL` |

- Each workflow ships as two files: the API file the app sends, and the UI file you open in ComfyUI. The UI file holds its App Mode setup, so it opens in App Mode with the inputs the app shows.
- An example in Motion's Library runs on the first-and-last-frame graph [`effects-ltx-2-5`](workflows/effects-ltx-2-5/README.md), on LTX 2.5, or on Motion's guide graph with a guide the engine holds.
- [docs/stack.md](docs/stack.md) lists every package and each call Rosesfield makes to Comfy.

## What each run made

The runs in [Made with Rosesfield](#made-with-rosesfield), with their models and costs. The Video edit run was made on 2026-10-22, and the others on 2026-10-29. Where a result was made from a picture, the row names the run that made that picture first.

| App | The run |
|---|---|
| Image, then Edit | A photo of a woman watering a garden with a hose, from GPT Image 2.5 Sunburst, high quality, 1024 by 1536, 12.64 credits, made in 55 seconds. Edit turns the water into a stream of orange and magenta petals and keeps the rest of the photo. GPT Image 2.5 Sunburst, 16.26 credits, made in 44 seconds. |
| Video | A goose in a red cape on a throne, from a start frame GPT Image 2.5 Sunburst made for 12.59 credits. The courtiers move and the camera pushes in. LTX 2.5, 720p, 5 seconds with sound, 6.52 credits, made in 33 seconds. |
| Edit | A camper van becomes a cake of the same shape, with a wedge cut from its side. The van is from Krea 2 Medium Turbo, 3.16 credits. The cake is from GPT Image 2.5 Sunburst, 18.55 credits, made in 55 seconds. |
| Shot | One shot from a wide field of red poppies down to one honeybee on one poppy. LTX 2.5, push in, 720p, 5 seconds with sound, 6.57 credits, made in 31 seconds. |
| Motion | Grab and run, an example in Motion's Library: a man runs toward the camera down a cobbled street with a bottle, and police run behind him. Motion's guide graph on LTX 2.5, 1080p, 4 seconds with sound, 16.79 credits, made in 71 seconds. |
| Relight | A ceramic jaguar head relit with orange light from the left and magenta light from the right. The head is from Krea 2 Medium Turbo, 3.17 credits. Qwen Image Edit 2509 with the Relight LoRA, 14.07 credits, made in 62 seconds. |
| Image | A flamingo under a bus stop shelter at night. GPT Image 2.5 Sunburst, high quality, 1024 by 1536, 12.62 credits, made in 45 seconds. |
| Characters | A character made from traits: a man with the head of a brown hare, in a laundromat. GPT Image 2.5 Sunburst, 16.05 credits, made in 66 seconds. |
| Expand | A square sunflower field widened to 16:9, 1536 by 864, with more flowers facing away on both sides. The field is from Seedream 5.0 Pro, 18.99 credits. The Qwen Image Inpaint graph, 4.03 credits, made in 23 seconds. |
| Upscale | A chameleon at twice its size, from 768 by 768 to 1536 by 1536. The photo is from Photon Flash 1, 0.67 credits, scaled to 768 by 768 with ffmpeg. The SeedVR2 3B graph, 1.28 credits, made in 14 seconds. |
| Remove background | A perfume bottle cut out from the roses around it onto a transparent background. The photo is from Grok Imagine Image, 4.22 credits. The BiRefNet graph, 0.25 credits, made in 9 seconds. |
| Video edit | A close-up clip at twice its frame rate, 48 frames a second. The FILM graph, 3.31 credits, made in 30 seconds. |

The clips of Edit, Relight, Expand, Upscale, Remove background and Image, then Edit show the input and then the result. They were put together with ffmpeg from the runs' own files, and the Upscale clip shows one detail of each at the same size.

The launch film types the goose's prompt into the Image app, then shows the name and the challenge's hashtag. It opens the model picker, then plays five previews in their apps' own viewers: the goose in Image, the bee in Shot, a Music track, a Speech line and a 3D rose. It counts 25+ apps, makes a key on Comfy and pastes it in Settings, and closes on the name and rosesfield.com. It is edited from the app's own screens, and every result in it is a stored run. The 3D rose came out white from Meshy's preview mode, and its colour was added after the run by a script that runs no model. Comfy's key page in it is redrawn, and no key appears.

## What was proven live

Each row counts the paid runs of one area in the running app on Comfy. The counts and credits come from the maintainers' run ledger, which is not in this repository. The credits are Comfy credits, read from Comfy's balance before and after each run. What you can check here is each example in `docs/media/examples` and the two Effects runs in [`packages/catalog/src/effects/runs.json`](packages/catalog/src/effects/runs.json), with their Comfy balance before and after.

| Area | Proven models | Date | Runs | Credits |
|---|---|---|---|---|
| Image | Luma Photon Flash 1, FLUX 3 Image, GPT Image 2.5 Flare, Krea 2 Medium Turbo, Grok Imagine Image, Seedream 5.0 Flash, and the graphs Z-Image Turbo, FLUX.2 Klein 4B and Qwen Image 2512 | 2026-10-19 | 32 | about 117 |
| Video | H3 Max Turbo, Seedance 1.0 Pro Fast, and the LTX 2.5 graphs from text and from a start frame | 2026-10-19 | 7 | about 74 |
| Effects | the Effects graph on LTX 2.5, with its last frame from Qwen Image Edit 2511 or FLUX.2 Klein 4B | 2026-10-19 and 2026-10-21 | 70 | 517 |
| Background removal | the BiRefNet graph | 2026-10-19 | 1 | 6.73 |
| Edit | the Qwen Image Edit 2511 graph | 2026-10-21 | 1 | 12.35 |
| Video edit | the BiRefNet background, FILM frame rate and LTX 2.3 reframe graphs | 2026-10-21 | 3 | 12.56 |

- Six of those runs left no output in Rosesfield. Comfy refused two Image runs at submit, before any charge. Three runs failed in Rosesfield after Comfy made the output, and each cause is fixed. One Effects run failed in Comfy, which charged nothing.
- Three runs hold an estimate instead of a reading: two Image runs, one of FLUX.2 Klein 4B and one of Kling Image O1, whose balance readings held another run, and one Video run of LTX 2.5 that failed before its reading. So Image and Video show about.
- Kling Image O1 ran on 2026-10-19 and is counted in the 32. It is not in the list, because the Image app now refuses every Kling Image O1 run with "These inputs do not fit this app." That defect is not fixed yet.
- Every Effects run of 2026-10-21 made a video, and none of the 15 met every criterion of its effect yet.
- The agent has no live turn in these counts yet.

From 2026-10-20 to 2026-10-22, eight showroom rounds made the examples above in the running app. Each row counts the paid runs of one app in those rounds, from the same ledger. Kept counts the results that a judge who wrote none of the prompts kept. A run made outside the rounds, such as a builder's live check, is not counted.

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

The gate runs `catalog:sync`, `generated:check`, `copy:check`, `glob:check`, `motion:check`, `cloud:check`, `docs:check`, `typecheck`, `lint` and `test`.

## Licence

The code, the docs and the design tokens are under the [MIT licence](LICENSE). Each model's licence decides what you may do with what it makes, per [docs/models.md](docs/models.md). The Rosesfield name and logo are trademarks of ROSSA AI, LLC. [TRADEMARKS.md](TRADEMARKS.md) says how you can use them.

Higgsfield and the names of its products belong to their owner. Rosesfield names them only to compare, and it is not affiliated with or endorsed by Higgsfield.

Every deployment serves a Privacy page at `/privacy` and a Terms page at `/terms`.

## Official source

The official repository is https://github.com/rossaai/rosesfield. A copy with a similar name is not official.

## Who makes it

Rosesfield is made and owned by ROSSA AI, LLC.
