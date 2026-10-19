# First light

`bun run first-light` runs each workflow in `workflows/` once against the engine your environment names, and writes one report per workflow. It spends real GPU time, so it starts only with an engine key.

## Run it

```sh
COMFY_API_KEY=comfyui-... bun run first-light --inputs <folder> --only effects-ltx-2-5,voice-chatterbox
```

| Setting | What it does |
|---|---|
| `COMFY_API_KEY` | Runs on the Comfy API v2. With no `COMFY_BASE_URL`, the target is Comfy Cloud at `https://cloud.comfy.org`. |
| `COMFY_BASE_URL` | Runs on another Comfy API v2: a Comfy deployment, or your own ComfyUI behind comfy-api-proxy, per `docs/stack.md` §Engine targets. |
| `RUNPOD_ENDPOINT_ID` and `RUNPOD_API_KEY` | Runs on a RunPod Serverless endpoint through worker-comfyui. |
| `--inputs <folder>` | The sample files for the workflows that take one: `image.png`, `image.jpg` or `image.webp`, `video.mp4` or `video.webm`, and `audio.wav`, `audio.mp3`, `audio.flac` or `audio.ogg`. A workflow whose sample is missing is skipped, and its report names the file. |
| `--values <file.json>` | Values for named inputs, as `{ "<workflow id>": { "<input>": <value> } }`. The names are the keys of each `entry.json`. |
| `--only <ids>` | Runs only these workflow ids, joined by commas. |
| `--out <folder>` | Where the reports go. The default is `data/first-light/<time>/`, which git ignores. |
| `--timeout <seconds>` | The bound for one run, 1800 by default. A run past it is cancelled. |

With no key it refuses to start and names the missing setting. With both `COMFY_BASE_URL` and `RUNPOD_ENDPOINT_ID` set it refuses too.

## What it runs

Each workflow's API file as it is in `workflows/<id>/`, with these changes:

- Each input of the type `cloud-asset` takes the sample file of its kind. The engine uploads it.
- Each bound text input that is empty in the file takes one sample sentence: "A red bicycle leans against a white wall in soft morning light."
- `--values` sets any named input.

Every other value stays as the file holds it, the seed included. A recipe or a variant the catalog derives with a patch does not run. One run per workflow is the first test of the file itself.

## What a report holds

`<id>.json` for each workflow, and the outputs as `<id>-1.<extension>`. `summary.md` lists them all.

| Field | Source |
|---|---|
| `status` | `succeeded`, `failed`, `cancelled`, `timed-out` or `skipped` |
| `seconds` | the time from submit to the end of the run, on this machine's clock |
| `queueSeconds` and `gpuSeconds` | Comfy: the job's `metrics.queue_ms` and `metrics.execution_ms`. RunPod: the status record's `delayTime` and `executionTime`. Empty when the engine reports none |
| `cost` | every metric whose name holds cost, credit, price or USD. The Comfy API v2 spec names none, so it stays empty until an engine reports one |
| `idempotencyKey`, `ref` and `workflowHash` | the key the submit sent, the engine's run id and the SHA256 of the graph |
| `outputs` | each output's file, kind, MIME type and size |

## Bounds

Every submit carries a fresh idempotency key. RunPod takes none, so the RunPod adapter sends one submit and no retry, per `docs/stack.md` §RunPod Serverless. Each poll waits 5 seconds or the engine's `Retry-After`, whichever is longer. A run past `--timeout` is cancelled, and so is a run whose status could not be read.

## Not checked

No run reached a live engine. `packages/catalog/test/first-light/first-light.test.ts` runs it against recorded Comfy API v2 and RunPod responses.
