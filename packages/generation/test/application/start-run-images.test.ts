import { type AppDefinition, appDefinition } from "@rosesfield/contract"
import { assetIdFormat } from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import { jpegHeader, padded, pngHeader } from "../image-bytes"
import { imageApp } from "../sample"
import { type Harness, harnessFor } from "./harness"

const photoId = assetIdFormat.parse("0a1b2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c01")

function photoApp(closedKey: string | null = null): AppDefinition {
  const app = imageApp()
  return appDefinition.parse({
    ...app,
    id: "photo-app",
    closedKey,
    inputs: app.inputs.map((input) =>
      input.name === "references"
        ? {
            ...input,
            accept: {
              formats: ["image/png", "image/jpeg"],
              maxBytes: 2000,
              minShortSide: 480,
            },
          }
        : input
    ),
  })
}

function withPhoto(
  mime: string,
  bytes: Uint8Array,
  closedKey: string | null = null
): Harness {
  const harness = harnessFor({ apps: [photoApp(closedKey)] })
  harness.assets.addFile({ assetId: photoId, kind: "image", mime, bytes })
  return harness
}

function startPhoto(harness: Harness) {
  return harness.start.execute({
    appId: "photo-app",
    body: { inputs: { prompt: "a red door in fog", references: [photoId] } },
    idempotencyKey: null,
    seed: null,
  })
}

async function refusal(
  harness: Harness
): Promise<{ code: string; message: string }> {
  const caught = await startPhoto(harness).catch((error: unknown) => error)
  expect(harness.jobs.enqueued).toEqual([])
  expect(
    await harness.runs.list({ appId: null, before: null, limit: 10 })
  ).toEqual([])
  return caught as { code: string; message: string }
}

describe("StartRunHandler checks each photo against what its input accepts", () => {
  it("starts a run on a PNG of 480 pixels on its short side within the bytes", async () => {
    const harness = withPhoto("image/png", pngHeader(853, 480))
    const { run } = await startPhoto(harness)
    expect(harness.jobs.enqueued).toEqual([run.id])
  })

  it("refuses a format the input does not take, and starts nothing", async () => {
    const error = await refusal(withPhoto("image/webp", pngHeader(853, 480)))
    expect(error).toMatchObject({ code: "RUN_INPUT_INVALID" })
    expect(error.message).toContain("references: the file is image/webp")
  })

  it("refuses a photo above the bytes the input takes, and starts nothing", async () => {
    const error = await refusal(
      withPhoto("image/png", padded(pngHeader(853, 480), 2001))
    )
    expect(error).toMatchObject({ code: "RUN_INPUT_INVALID" })
    expect(error.message).toContain("2001 bytes, above 2000")
  })

  it("refuses a photo under the short side the input takes, and starts nothing", async () => {
    const error = await refusal(withPhoto("image/jpeg", jpegHeader(640, 479)))
    expect(error).toMatchObject({ code: "RUN_INPUT_INVALID" })
    expect(error.message).toContain("479 pixels on its short side, below 480")
  })

  it("refuses a file that declares no size, and starts nothing", async () => {
    const error = await refusal(withPhoto("image/png", new Uint8Array(64)))
    expect(error).toMatchObject({ code: "RUN_INPUT_INVALID" })
    expect(error.message).toContain("declares no width and height")
  })

  it("refuses every run of a closed app before it reads a photo", async () => {
    const error = await refusal(
      withPhoto("image/png", pngHeader(853, 480), "closed")
    )
    expect(error).toMatchObject({ code: "APP_CLOSED", status: 409 })
  })
})
