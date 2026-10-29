# Changelog

Each release is a tag `v<version>` on `main` and a GitHub release with the same notes. Versions follow [Semantic Versioning](https://semver.org). Publishing a release deploys it, per [docs/self-host.md](docs/self-host.md).

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
- 114 proof runs and 122 showroom runs on Comfy, counted in the README's [What was proven live](README.md#what-was-proven-live).

Known limits: the agent has no live turn counted yet, and the Image app refuses every Kling Image O1 run, per the README's [What was proven live](README.md#what-was-proven-live).
