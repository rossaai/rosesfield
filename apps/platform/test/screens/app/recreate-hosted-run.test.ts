import { type Run, run } from "@rosesfield/contract"
import type { QueryClient } from "@tanstack/react-query"
import { describe, expect, it } from "vitest"
import { findCatalogApp } from "@/catalog/catalog-apps"
import { valuesFromRun } from "@/screens/app/app-form"
import { fillFromRun } from "@/screens/app/form-fill"

const referenceId = "1b2c3d4e-5f60-4718-9a2b-3c4d5e6f7a80"

function runOf(
  id: string,
  inputs: Record<string, string | number | string[]>,
  count = 1
): Run {
  return run.parse({
    id,
    appId: "image",
    status: "done",
    inputs,
    count,
    aspectRatio: null,
    seed: null,
    outputs: [],
    progress: null,
    engine: { adapter: "demo", models: [], workflowHash: null },
    cost: null,
    origin: "demo",
    failure: null,
    createdAt: "2026-10-19T10:00:00.000Z",
    finishedAt: "2026-10-19T10:00:03.000Z",
  })
}

const hostedInputs = {
  model: "bfl/flux-3-image",
  prompt: "A lighthouse at dusk",
  images: [referenceId],
  safetyTolerance: 2,
  grounding: "on",
  aspectRatio: "1:1",
  resolution: "1k",
}

const graphInputs = {
  prompt: "A lighthouse at dusk",
  model: "z-image-turbo",
  resolution: "1k",
}

function clientWith(record: Run): QueryClient {
  return {
    fetchQuery: async () => ({ run: record }),
  } as unknown as QueryClient
}

describe("Recreate from History on the Image app", () => {
  const app = findCatalogApp("image")
  if (app === null) {
    throw new Error("no image app")
  }

  it("keeps every input of a hosted run, its references and its aspect", () => {
    const values = valuesFromRun(
      app,
      runOf("93e9078d-0000-4000-8000-000000000001", hostedInputs)
    )
    expect(values.inputs).toEqual(hostedInputs)
  })

  it("keeps every input of a hosted run through the History seed", async () => {
    const record = runOf(
      "93e9078d-0000-4000-8000-000000000001",
      hostedInputs,
      3
    )
    const values = await fillFromRun(clientWith(record), app, record.id)
    expect(values?.inputs).toEqual(hostedInputs)
    expect(values?.count).toBe(3)
  })

  it("keeps every input of a graph run", async () => {
    const record = runOf("93e9078d-0000-4000-8000-000000000002", graphInputs)
    expect(valuesFromRun(app, record).inputs).toMatchObject(graphInputs)
    const values = await fillFromRun(clientWith(record), app, record.id)
    expect(values?.inputs).toMatchObject(graphInputs)
  })
})
