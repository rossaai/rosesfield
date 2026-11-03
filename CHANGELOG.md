# Changelog

Each release is a tag `v<version>` on `main` and a GitHub release with the same notes. Versions follow [Semantic Versioning](https://semver.org). Publishing a release deploys it, per [docs/self-host.md](docs/self-host.md).

## 0.2.3, 2026-11-03

- The README shows AI Influencer, then Motion: the capybara in a brown suit that AI Influencer made runs down a beach road and catches a garbage truck in Motion. It takes the place of the Video edit example.
- The README's Motion example is Grab and run as Motion's Library shows it, made on the 60 fps temporal pass.
- Explore no longer shows the Video edit example that zooms into an eye.

## 0.2.2, 2026-11-03

- Motion has two tabs, Move and Swap. Its model picker lists models, LTX 2.5 and LTX 2.3, and the technique each one runs is the app's choice.
- Motion takes a clip longer than its model does: it uses the first 10 seconds, 5 on Swap, and says so in one sentence. Swap no longer admits 10 seconds while its graph keeps 5.
- A Library example takes a photo of any shape and fits it to its guide. The notes on how many photos to bring and how to frame them are gone.
- Motion's Library shows Grab and run made on the 60 fps temporal pass, and a second example, Catch the truck, whose Recreate opens your own video path with its clip, so any photo of a character or a person works.
- Video no longer has a Camera move card. A move is words you write in the prompt. Remake still puts its planned move in the prompt.
- How it works names the model the picker opens on, and the result says which model made it.
- A model or app name cut on one line shows whole in a tooltip, and the Featured badge beside an app's name stays whole.
- The photo count shows only when the well is full.
- Generate on your own video shows the price of the graphs the first-frame edit and the draft run, so it never shows less than the run costs.
- A run's measured cost never takes the charge of a run before it that posted late, so a price measured on your last run is that run's own.
- Recreate refills an app that is already open, and a run made on a model the app no longer offers opens on the app's default.

## 0.2.1, 2026-11-02

- Motion holds faces and legs through fast motion. Its LTX 2.5 guide graph now refines a latent that LTX 2.5's temporal upscaler makes 4 times longer, conditioned at 4 times the guide's frame rate up to 60 fps, the cap Lightricks' own temporal pipeline sets, and keeps every fourth frame, per [workflows/motion-guide-ltx-2-5](workflows/motion-guide-ltx-2-5/README.md). A run costs about twice what it did, and Generate shows its measured price.
- Video, Shot, Video edit and Lipsync open on the first model of their list. A model whose length is automatic no longer empties the list.
- Generate waits, with no price, until an app's model list arrives, so a press never prices or starts a model you did not pick. This covers Characters, Layers and Storyboard too.
- A model list answers from its kept copy when an earlier read of one model's schema failed.
- Motion's examples keep the seed you set, in the draft and in the final.
- Recreate is one action with one icon on every surface, and an AI Influencer template opens on the model its tile names.
- Speech's How it works names the model its picker opens on.
- A Library example link opens its example on its own model, even after you used the app.
- A model name the picker cuts shows whole in a tooltip.
- A measured price belongs to the graph that ran it, so a changed graph never shows an earlier graph's price as measured.
- Motion's guide graph declares the two packs its sound nodes come from, and `bun run packs:check` refuses a graph that runs a node from a pack its entry does not declare.

## 0.2.0, 2026-10-30

- AI Influencer, a new featured app. Pick traits, many of them absurd, such as a capybara, frog or mantis head on a human body, and get one character sheet on white: a portrait beside the same character whole body. It opens on GPT Image 2.5 at medium quality, and its Library holds four templates made in the app that you can remix. Use in Motion sends a sheet to Motion.
- Motion's LTX 2.3 swap redraws only the person you name in your clip from your photo, with Alissonerdx's masked reference inpaint LoRA, and keeps the rest of your clip, per [workflows/motion-swap-ltx-2-3](workflows/motion-swap-ltx-2-3/README.md).
- Motion's read step tracks one object per target, so the people beside the person you replace keep their own pixels.
- Video and Shot load LTX 2.5's bf16 transformer and text encoder, as Motion does.
- The top bar scrolls sideways on a computer when its links do not fit, and keeps its menu on a phone.
- Explore shows AI Influencer's four templates, each opening the app with its traits.
- The README and the workflow docs state what Rosesfield does as present facts, and the README describes Motion's LTX workflow step by step.

## 0.1.2, 2026-10-29

- A new version of the installed app takes over at once and reloads the page. Before, it waited until every tab of the app was closed.

## 0.1.1, 2026-10-29

- Every response carries security headers: HSTS, `nosniff`, `X-Frame-Options: SAMEORIGIN`, a referrer policy and a permissions policy with no camera, microphone, location or payment. The static files Cloudflare serves carry the same set from `apps/platform/public/_headers`, per [docs/self-host.md](docs/self-host.md).
- The privacy page names Cloudflare Web Analytics, which counts page views without a cookie and without fingerprinting you.

## 0.1.0, 2026-10-29

The first public release.

- 25+ apps for images, video, audio, characters and 3D, on your own Comfy key, with no account.
- 30+ ComfyUI workflows. All but one load open weights. Each ships as the API file the app runs and a UI file that opens in ComfyUI and in App Mode, per [workflows/README.md](workflows/README.md).
- Every Comfy Router model of each app's task, read live from Comfy.
- Runs on the Comfy Router, on Comfy Cloud, or on your own ComfyUI through comfy-api-proxy.
- One library, one set of characters and one history shared by every app.
- Ways in: the web app, installable on a phone, an MCP server with one tool per app, an HTTP API with one route per app, and an agent that runs the apps for you.
- Hosts: your machine with bun, or Cloudflare Workers in public mode on each visitor's own key, with a private owner link that spends one key up to a cap, per [docs/self-host.md](docs/self-host.md).

