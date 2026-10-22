import type {
  AppDefinition,
  EngineBinding,
  KeyCheck,
  RunOrigin,
} from "@rosesfield/contract"
import {
  AppCatalog,
  type EngineOutput,
  type EngineStatus,
  type EngineSubmission,
  GenerationEngine,
  type HostedModel,
  JobRunner,
  ModelPolicy,
  type Run,
  RunRepository,
  StartRunHandler,
} from "@rosesfield/generation"
import { hostedModelOf, type ModelForm } from "@rosesfield/generation/bindings"
import { FixedClock } from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import { keyframesOf } from "#storyboard/keyframe-facts"
import { keyframeCallsOf } from "#storyboard/storyboard-chain"
import { anchorId, characterId, definition } from "./storyboard-asks"

const hostedModel = "bfl/flux-3-image"

const hostedForm: ModelForm = {
  model: hostedModel,
  fields: [
    {
      kind: "prompt",
      name: "prompt",
      path: "prompt",
      required: true,
      maxLength: null,
      default: null,
    },
    {
      kind: "media",
      name: "image",
      path: "image",
      required: false,
      media: "image",
      min: 0,
      max: 10,
    },
  ],
}

class FormEngine extends GenerationEngine {
  override readonly key = "form-engine"
  override readonly origin: RunOrigin = "live"
  override readonly idempotency = "keyed"

  override canRun(binding: EngineBinding): boolean {
    return hostedModelOf(binding) === hostedModel
  }

  override outputsPerJob(): "all" {
    return "all"
  }

  override async submit(): Promise<EngineSubmission> {
    return { ref: "ref", models: [], workflowHash: null }
  }

  override submitLimitMs(): number {
    return 0
  }

  override async read(): Promise<EngineStatus> {
    return { state: "succeeded" }
  }

  override async listOutputs(): Promise<EngineOutput[]> {
    return []
  }

  override cancel(): Promise<void> {
    return Promise.resolve()
  }

  override async checkKey(): Promise<KeyCheck> {
    return "valid"
  }

  override async formOf(binding: EngineBinding): Promise<ModelForm | null> {
    return this.canRun(binding) ? hostedForm : null
  }

  override async listModels(): Promise<readonly HostedModel[]> {
    return [
      {
        id: hostedModel,
        provider: "bfl",
        takes: ["image", "text"],
        makes: ["image"],
        form: hostedForm,
      },
    ]
  }
}

class EveryModel extends ModelPolicy {
  override allows(): boolean {
    return true
  }
}

class OneApp extends AppCatalog {
  override find(appId: string): AppDefinition | null {
    return appId === definition.id ? definition : null
  }
}

class NoJobs extends JobRunner {
  override enqueue(): Promise<void> {
    return Promise.resolve()
  }
}

class KeptRuns extends RunRepository {
  override async add(run: Run): Promise<Run> {
    return run.withVersion(1)
  }

  override async save(run: Run): Promise<Run> {
    return run
  }

  override async get(): Promise<Run | null> {
    return null
  }

  override async findByIdempotencyKey(): Promise<Run | null> {
    return null
  }

  override async list(): Promise<Run[]> {
    return []
  }

  override async listUnfinished(): Promise<Run[]> {
    return []
  }
}

const start = new StartRunHandler({
  apps: new OneApp(),
  runs: new KeptRuns(),
  engines: [new FormEngine()],
  jobs: new NoJobs(),
  clock: new FixedClock({ now: new Date("2026-10-21T09:00:00.000Z") }),
  policy: new EveryModel(),
})

const scenes = {
  sceneCount: "2",
  scene1: "A fox at dusk",
  scene2: "A fox in snow",
  look: "warm film",
}

function hostedCall(number: number) {
  const call = keyframeCallsOf({
    inputs: { model: hostedModel, reference: [anchorId], ...scenes },
    aspectRatio: null,
    hosted: { form: hostedForm.fields, settings: {}, photos: [] },
  }).find((one) => one.number === number)
  if (call === undefined) {
    throw new Error(`No call makes keyframe ${number}`)
  }
  return call
}

describe("a Storyboard keyframe made on a hosted model", () => {
  it("is started with its scene, look and keyframe, and History reads its prompt", async () => {
    const { run } = await start.execute({
      appId: definition.id,
      body: { inputs: hostedCall(2).request.inputs },
      idempotencyKey: null,
      seed: null,
    })
    expect(keyframesOf(run)).toEqual([
      expect.objectContaining({
        number: 2,
        scene: "A fox in snow",
        prompt: "A fox in snow warm film",
      }),
    ])
  })

  it("keeps the reference with the run, and History reads it as the anchor", async () => {
    const { run } = await start.execute({
      appId: definition.id,
      body: { inputs: hostedCall(2).request.inputs },
      idempotencyKey: null,
      seed: null,
    })
    expect(run.inputs.reference).toEqual([anchorId])
    expect(run.inputs.image).toEqual([anchorId])
    expect(keyframesOf(run)).toEqual([
      expect.objectContaining({
        number: 2,
        anchor: { kind: "reference", assetId: anchorId },
      }),
    ])
  })

  it("refuses a character beside a reference, as the app's own rule does", async () => {
    const inputs = {
      ...hostedCall(1).request.inputs,
      character: [characterId],
    }
    await expect(
      start.execute({
        appId: definition.id,
        body: { inputs },
        idempotencyKey: null,
        seed: null,
      })
    ).rejects.toThrow(/character: character applies only when/)
  })

  it("control: still refuses the first keyframe, which is neither app-only nor the model's", async () => {
    const inputs = {
      ...hostedCall(1).request.inputs,
      firstKeyframe: [anchorId],
    }
    await expect(
      start.execute({
        appId: definition.id,
        body: { inputs },
        idempotencyKey: null,
        seed: null,
      })
    ).rejects.toThrow(/firstKeyframe: the model takes no such input/)
  })
})
