import { FixedClock } from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import { hostedModelBinding } from "#domain/task-binding"
import { ComfyRouterGenerationEngine } from "#infrastructure/comfy-router-generation-engine"
import { RouterCatalog } from "#infrastructure/router/router-catalog"
import { pngBytes, referenceId, start } from "../sample"
import {
  catalogPage,
  pictureModel,
  pictureSchema,
  queueStatus,
  ratesUrl,
  refused,
  routerSchema,
  routerUrl,
  schemaRead,
  submitted,
} from "./fixtures/comfy-router"
import { type Recording, ReplayFetch } from "./replay-fetch"

const binding = hostedModelBinding(pictureModel)

function engineWith(recordings: Recording[], apiKey: string | null = "key") {
  const replay = new ReplayFetch(recordings)
  const clock = new FixedClock({ now: start })
  const catalog = new RouterCatalog({ clock })
  const engine = new ComfyRouterGenerationEngine({
    apiKey,
    catalog,
    fetch: replay.fetch,
  })
  return { engine, replay, catalog, clock }
}

const catalogRead = [
  catalogPage([pictureModel]),
  schemaRead(pictureModel, pictureSchema),
]

function request(inputs: Record<string, string | number | string[]>) {
  return {
    idempotencyKey: "run-1",
    binding,
    inputs: { model: pictureModel, ...inputs },
    files: [
      {
        assetId: referenceId,
        kind: "image" as const,
        mime: "image/png",
        bytes: pngBytes(),
      },
    ],
    count: 1,
    aspectRatio: null,
    seed: null,
    outputKind: "image" as const,
  }
}

describe("ComfyRouterGenerationEngine", () => {
  it("sends the form as the model's own body with the key and an idempotency key", async () => {
    const { engine, replay } = engineWith([...catalogRead, submitted()])
    await engine.submit(
      request({
        prompt: "a red door",
        aspectRatio: "16:9",
        raw: "on",
        seed: 7,
        images: [referenceId],
      })
    )
    const sent = replay.sent.at(-1)
    expect(sent?.url).toBe(`${routerUrl}/v2/models/${pictureModel}/requests`)
    expect(sent?.headers.get("x-api-key")).toBe("key")
    expect(sent?.headers.get("idempotency-key")).toBe("run-1")
    const body = JSON.parse(sent?.body ?? "{}")
    expect(Object.keys(body).sort()).toEqual([
      "aspect_ratio",
      "images",
      "prompt",
      "raw",
      "seed",
    ])
    expect(body).toMatchObject({
      prompt: "a red door",
      aspect_ratio: "16:9",
      raw: true,
      seed: 7,
    })
    expect(body.images[0]).toMatch(/^data:image\/png;base64,/)
  })

  it("describes the form from the schema and hides the fields Router owns", async () => {
    const { engine } = engineWith(catalogRead)
    const form = await engine.formOf(binding)
    expect(form?.fields.map((field) => [field.name, field.kind])).toEqual([
      ["prompt", "prompt"],
      ["images", "media"],
      ["aspectRatio", "choice"],
      ["seed", "number"],
      ["raw", "toggle"],
    ])
    expect(form?.fields.find((field) => field.name === "images")).toMatchObject(
      {
        media: "image",
        max: 10,
      }
    )
  })

  it.each([
    [
      403,
      "not_enabled",
      "Comfy Router is not enabled for this account yet.",
      "ENGINE_NOT_ENABLED",
    ],
    [
      403,
      "not_enabled",
      "This key has no workspace behind it.",
      "ENGINE_KEY_OUTSIDE_WORKSPACE",
    ],
    [
      402,
      "insufficient_credits",
      "The workspace cannot fund the run.",
      "ENGINE_NO_CREDITS",
    ],
    [422, "invalid_input", "prompt is required", "RUN_INPUT_REFUSED"],
  ])(
    "maps a submit answered %i %s to its own error",
    async (status, type, detail, code) => {
      const { engine } = engineWith([
        ...catalogRead,
        refused(
          "POST",
          `/v2/models/${pictureModel}/requests`,
          status,
          type,
          detail
        ),
      ])
      await expect(
        engine.submit(request({ prompt: "a" }))
      ).rejects.toMatchObject({ code })
    }
  )

  it("reads a finished request that failed as a failure with its reason", async () => {
    const { engine } = engineWith([
      queueStatus("COMPLETED", "content_policy_violation"),
    ])
    const status = await engine.read(
      `${pictureModel}|queued|6f1a1a6e-6a53-4a5f-9d3a-2b3b0a1f9c21`
    )
    expect(status).toMatchObject({
      state: "failed",
      error: { code: "RUN_INPUT_REFUSED" },
    })
  })

  it("runs a model that answers bytes on the synchronous route and hands its outputs back at submit", async () => {
    const voice = routerSchema({
      model: "maker/voice-1",
      takes: ["text"],
      makes: ["audio"],
      answers: "audio/mpeg",
      properties: { text: { type: "string" } },
      required: ["text"],
    })
    const audio = new Uint8Array([0x49, 0x44, 0x33, 4, 0, 0, 0, 0, 0, 0])
    const { engine, replay } = engineWith([
      catalogPage(["maker/voice-1"]),
      schemaRead("maker/voice-1", voice),
      {
        method: "POST",
        url: `${routerUrl}/v2/models/maker/voice-1`,
        status: 200,
        headers: { "Content-Type": "audio/mpeg", "X-Comfy-Credits-Used": "3" },
        bytes: audio,
      },
    ])
    const submission = await engine.submit({
      ...request({ text: "hello" }),
      binding: hostedModelBinding("maker/voice-1"),
      inputs: { model: "maker/voice-1", text: "hello" },
      files: [],
    })
    expect(submission.finished).toMatchObject({
      cost: { amount: 3 / 211, currency: "USD" },
      outputs: [{ kind: "audio", mime: "audio/mpeg" }],
    })
    expect(await engine.read(submission.ref)).toEqual({ state: "succeeded" })
    expect(replay.unused()).toEqual([])
  })

  it("prices from the published rates when the estimate is not enabled for the key", async () => {
    const { engine, replay } = engineWith([
      ...catalogRead,
      refused(
        "POST",
        `/v2/models/${pictureModel}/estimate`,
        403,
        "not_enabled",
        "not enabled"
      ),
      {
        method: "GET",
        url: ratesUrl,
        status: 200,
        json: {
          rates: [
            {
              model_id: pictureModel,
              credits: "8.44",
              unit: "per generation",
              conditions: "",
            },
          ],
        },
      },
      {
        method: "POST",
        url: `${routerUrl}/v2/models/${pictureModel}/estimate`,
        status: 200,
        json: { source: "exact", credits: "99" },
      },
    ])
    const price = await engine.priceOf(binding, {
      inputs: { prompt: "a" },
      count: 1,
    })
    expect(price).toEqual({
      source: "rates",
      credits: 8.44,
      from: "rate-card",
      perOutput: true,
    })
    const again = await engine.priceOf(binding, {
      inputs: { prompt: "b" },
      count: 1,
    })
    expect(again).toEqual({
      source: "rates",
      credits: 8.44,
      from: "rate-card",
      perOutput: true,
    })
    expect(replay.unused().map((one) => one.url)).toEqual([
      `${routerUrl}/v2/models/${pictureModel}/estimate`,
    ])
  })

  it("asks Comfy's estimate for a model that takes media, with small stand-in files", async () => {
    const { engine, replay } = engineWith([
      ...catalogRead,
      {
        method: "POST",
        url: `${routerUrl}/v2/models/${pictureModel}/estimate`,
        status: 200,
        json: { source: "exact", credits: "4.2" },
      },
    ])
    const price = await engine.priceOf(binding, {
      inputs: { prompt: "a", images: [referenceId] },
      count: 1,
    })
    expect(price).toEqual({
      source: "estimate",
      credits: 4.2,
      from: "engine-estimate",
      perOutput: true,
    })
    const body = JSON.parse(replay.sent.at(-1)?.body ?? "{}")
    expect(body.images).toHaveLength(1)
    expect(body.images[0]).toMatch(/^data:image\/png;base64,/)
    expect(body.images[0]).not.toBe(
      `data:image/png;base64,${btoa(String.fromCharCode(...pngBytes()))}`
    )
  })

  it("answers price unknown for a model the rates do not price", async () => {
    const { engine } = engineWith([
      ...catalogRead,
      refused(
        "POST",
        `/v2/models/${pictureModel}/estimate`,
        403,
        "not_enabled",
        "not enabled"
      ),
      { method: "GET", url: ratesUrl, status: 200, json: { rates: [] } },
    ])
    expect(
      await engine.priceOf(binding, { inputs: { prompt: "a" }, count: 1 })
    ).toEqual({
      source: "unknown",
      credits: null,
    })
  })

  it("runs nothing without a key", () => {
    const { engine } = engineWith([], null)
    expect(engine.canRun(binding)).toBe(false)
  })
})
