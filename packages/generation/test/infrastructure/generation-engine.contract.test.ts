import type { EngineBinding } from "@rosesfield/contract"
import { FixedClock } from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import type {
  EngineRequest,
  GenerationEngine,
} from "#domain/generation-engine.port"
import { hostedModelBinding } from "#domain/task-binding"
import { ComfyGenerationEngine } from "#infrastructure/comfy-generation-engine"
import { ComfyRouterGenerationEngine } from "#infrastructure/comfy-router-generation-engine"
import { DemoGenerationEngine } from "#infrastructure/demo-generation-engine"
import { RouterCatalog } from "#infrastructure/router/router-catalog"
import { RunPodServerlessGenerationEngine } from "#infrastructure/runpod-serverless-generation-engine"
import { FakeGenerationEngine } from "../fake/fake-generation-engine"
import { fakeBinding, pngBytes, start } from "../sample"
import {
  cancelled,
  catalogPage,
  outputFile,
  pictureModel,
  pictureSchema,
  queueStatus,
  result,
  schemaRead,
  submitted,
} from "./fixtures/comfy-router"
import {
  cloudUrl,
  comfyV2At,
  proxyUrl,
  queuedJob,
  runningJob,
  succeededJob,
  workflowBinding,
} from "./fixtures/comfy-v2"
import { endpointId, runPod } from "./fixtures/runpod-serverless"
import { type Recording, ReplayFetch } from "./replay-fetch"

type Setup = {
  engine: GenerationEngine
  binding: EngineBinding
  tick: () => void
  replay: ReplayFetch | null
}

type Subject = {
  name: string
  create: () => Setup
  forKeyCheck: () => Setup
}

function fakeSetup(): Setup {
  return {
    engine: new FakeGenerationEngine({
      steps: [
        { state: "running", progress: 0.5, retryAfterSeconds: null },
        { state: "succeeded" },
      ],
      outputs: [
        {
          kind: "image",
          mime: "image/png",
          bytes: pngBytes(),
          width: null,
          height: null,
          durationSeconds: null,
        },
      ],
    }),
    binding: fakeBinding,
    tick: () => undefined,
    replay: null,
  }
}

function demoSetup(): Setup {
  const clock = new FixedClock({ now: start })
  return {
    engine: new DemoGenerationEngine({ clock }),
    binding: workflowBinding,
    tick: () => clock.advance(1000),
    replay: null,
  }
}

function comfySetup(
  baseUrl: string,
  apiKey: string | null,
  recordings: (v2: ReturnType<typeof comfyV2At>) => Recording[]
): () => Setup {
  return () => {
    const replay = new ReplayFetch(recordings(comfyV2At(baseUrl)))
    return {
      engine: new ComfyGenerationEngine({
        apiKey,
        baseUrl,
        fetch: replay.fetch,
      }),
      binding: workflowBinding,
      tick: () => undefined,
      replay,
    }
  }
}

const comfyRun = (v2: ReturnType<typeof comfyV2At>): Recording[] => [
  v2.submit(queuedJob),
  v2.read(queuedJob),
  v2.read(runningJob),
  v2.read(succeededJob),
  v2.read(succeededJob),
  v2.content(),
  v2.cancel(),
]

function runPodSetup(recordings: Recording[]): () => Setup {
  return () => {
    const replay = new ReplayFetch(recordings)
    return {
      engine: new RunPodServerlessGenerationEngine({
        apiKey: "rpa_test",
        endpointId,
        fetch: replay.fetch,
      }),
      binding: workflowBinding,
      tick: () => undefined,
      replay,
    }
  }
}

function routerSetup(recordings: Recording[]): () => Setup {
  return () => {
    const replay = new ReplayFetch(recordings)
    return {
      engine: new ComfyRouterGenerationEngine({
        apiKey: "comfyui-test",
        catalog: new RouterCatalog({ clock: new FixedClock({ now: start }) }),
        fetch: replay.fetch,
      }),
      binding: hostedModelBinding(pictureModel),
      tick: () => undefined,
      replay,
    }
  }
}

const subjects: Subject[] = [
  { name: "the fake engine", create: fakeSetup, forKeyCheck: fakeSetup },
  { name: "the demo engine", create: demoSetup, forKeyCheck: demoSetup },
  {
    name: "Comfy Cloud through the Comfy API v2",
    create: comfySetup(cloudUrl, "comfyui-test", comfyRun),
    forKeyCheck: comfySetup(cloudUrl, "comfyui-test", (v2) => [v2.keyCheck()]),
  },
  {
    name: "your ComfyUI through comfy-api-proxy, with no key",
    create: comfySetup(proxyUrl, null, comfyRun),
    forKeyCheck: comfySetup(proxyUrl, null, (v2) => [v2.keyCheck()]),
  },
  {
    name: "RunPod Serverless through worker-comfyui",
    create: runPodSetup([
      runPod.run(),
      runPod.status("IN_QUEUE"),
      runPod.status("IN_PROGRESS"),
      runPod.completed(),
      runPod.completed(),
      runPod.cancel(),
    ]),
    forKeyCheck: runPodSetup([runPod.health()]),
  },
  {
    name: "a hosted model through Comfy Router",
    create: routerSetup([
      catalogPage([pictureModel]),
      schemaRead(pictureModel, pictureSchema),
      submitted(),
      queueStatus("IN_QUEUE"),
      queueStatus("IN_PROGRESS"),
      queueStatus("COMPLETED"),
      result(),
      outputFile(pngBytes()),
      cancelled(),
    ]),
    forKeyCheck: routerSetup([
      {
        method: "GET",
        url: `${ComfyRouterGenerationEngine.routerUrl}/v2/models?limit=1`,
        status: 200,
        json: { data: [], has_more: false },
      },
    ]),
  },
]

function requestFor(binding: EngineBinding): EngineRequest {
  return {
    idempotencyKey: "1c2d3e4f-5a6b-4c7d-9e8f-0a1b2c3d4e5f",
    binding,
    inputs: { prompt: "a red door in fog" },
    files: [],
    count: 1,
    aspectRatio: "16:9",
    seed: 42,
    outputKind: "image",
  }
}

describe.each(subjects)("GenerationEngine contract: $name", (subject) => {
  it("runs the binding it was made for", () => {
    const { engine, binding } = subject.create()
    expect(engine.canRun(binding)).toBe(true)
    expect(["all", "one"]).toContain(engine.outputsPerJob(binding))
  })

  it("takes a run from submit to outputs of the kind it asked for", async () => {
    const { engine, binding, tick, replay } = subject.create()
    const submission = await engine.submit(requestFor(binding))
    expect(submission.ref).not.toBe("")
    const states: string[] = []
    for (let read = 0; read < 10 && states.at(-1) !== "succeeded"; read += 1) {
      const status = await engine.read(submission.ref)
      states.push(status.state)
      tick()
    }
    expect(states.at(-1)).toBe("succeeded")
    expect(
      states.every((state) =>
        ["queued", "running", "succeeded"].includes(state)
      )
    ).toBe(true)
    const outputs = await engine.listOutputs(submission.ref)
    expect(outputs.length).toBeGreaterThan(0)
    for (const output of outputs) {
      expect(output.kind).toBe("image")
      expect(output.mime).toMatch(/^image\//)
      expect(output.bytes.length).toBeGreaterThan(0)
    }
    await engine.cancel(submission.ref)
    expect(replay?.unused() ?? []).toEqual([])
  })

  it("names its origin as live or demo", () => {
    const { engine } = subject.create()
    expect(["live", "demo"]).toContain(engine.origin)
  })

  it("checks its key with reads only, so it starts no paid run", async () => {
    const { engine, replay } = subject.forKeyCheck()
    expect(await engine.checkKey()).toBe("valid")
    expect(replay?.sent.map((sent) => sent.method) ?? []).not.toContain("POST")
    expect(replay?.unused() ?? []).toEqual([])
  })
})
