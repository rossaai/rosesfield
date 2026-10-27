import { anglePromptsOf, viewsOf } from "@rosesfield/catalog/characters"
import type { CatalogModel } from "@rosesfield/catalog/comfy"
import { run } from "@rosesfield/contract"
import type { QueryClient } from "@tanstack/react-query"
import { cleanup, fireEvent, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { characterQuery, runQuery } from "@/api/queries"
import { t, tCatalog } from "@/copy/t"
import { readLastUsed } from "@/screens/app/hosted/last-used"
import { qwenEdit, zImage } from "../image/image-screen"
import {
  anglesEdit,
  anglesRunId,
  answerRunsWith,
  type Call,
  calls,
  characterId,
  characters,
  counted,
  findColumnGenerate,
  graphCredits,
  modelOf,
  openCharacters,
  photos,
  pricedName,
  promptOf,
  startedBodies,
  stubGateway,
  viewCredits,
} from "./traits-screen"

beforeEach(stubGateway)

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

type AnglesOpen = { model?: CatalogModel; isCharacterRead?: boolean }

function anglesRunOf(id: string, model: CatalogModel) {
  return run.parse({
    id,
    appId: characters.id,
    status: "queued",
    inputs: {
      mode: "angles",
      model: model.id,
      angleSet: "turnaround",
    },
    count: 1,
    aspectRatio: null,
    seed: null,
    outputs: [],
    progress: null,
    engine: { adapter: "comfy-task", models: [], workflowHash: null },
    cost: null,
    origin: "live",
    failure: null,
    createdAt: "2026-10-17T10:00:00.000Z",
    finishedAt: null,
  })
}

function openAngles(open: AnglesOpen = {}): QueryClient {
  const model = open.model ?? anglesEdit
  const shown = run.parse({
    ...anglesRunOf(anglesRunId, model),
    status: "done",
    inputs: {
      mode: "angles",
      model: model.id,
      character: [characterId],
      angleSet: "turnaround",
    },
    outputs: photos.slice(0, 1),
    finishedAt: "2026-10-17T10:00:03.000Z",
  })
  return openCharacters({ use: undefined, from: anglesRunId }, (client) => {
    client.setQueryData(runQuery(anglesRunId).queryKey, { run: shown })
    if (open.isCharacterRead === false) {
      return
    }
    client.setQueryData(characterQuery(characterId).queryKey, {
      character: {
        id: characterId,
        name: "Mara",
        references: photos,
        notes: "",
        createdAt: "2026-10-17T09:00:00.000Z",
      },
    })
  })
}

function priceCalls(): Call[] {
  return calls.filter((call) =>
    call.url.endsWith(`/api/apps/${characters.id}/price`)
  )
}

const viewRunIds = [
  "6a7b8c9d-0e1f-4a2b-8c3d-4e5f6a7b8c01",
  "6a7b8c9d-0e1f-4a2b-8c3d-4e5f6a7b8c02",
  "6a7b8c9d-0e1f-4a2b-8c3d-4e5f6a7b8c03",
  "6a7b8c9d-0e1f-4a2b-8c3d-4e5f6a7b8c04",
]

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

function viewOf(call: Call): number {
  const found = /-view-(\d)$/.exec(call.key)
  return found === null ? 0 : Number(found[1])
}

describe("the angles of Characters on a hosted image edit model", () => {
  it("price the set at 4 times one view on Generate, and start one run per view, each with the character's photos, the angles mode and the view it asks for", async () => {
    openAngles()
    const generate = await screen.findByRole("button", {
      name: pricedName(viewCredits * 4),
    })
    expect(
      screen.queryByRole("button", { name: pricedName(viewCredits) })
    ).toBeNull()
    fireEvent.click(generate)
    await vi.waitFor(() => expect(startedBodies()).toHaveLength(4))
    const bodies = startedBodies()
    expect(bodies.map(promptOf)).toEqual(anglePromptsOf("turnaround"))
    expect(bodies).toEqual(
      viewsOf("turnaround").map((view, index) => ({
        inputs: {
          mode: "angles",
          model: anglesEdit.id,
          character: [characterId],
          angleSet: "turnaround",
          view,
          prompt: anglePromptsOf("turnaround")[index],
          input_images: photos,
        },
      }))
    )
  })

  it("ask the price of the set once per edit, with no second price request of the plain app form", async () => {
    openAngles()
    await screen.findByRole("button", { name: pricedName(viewCredits * 4) })
    const hosted = priceCalls().filter(
      (call) => modelOf(call.body) === anglesEdit.id
    )
    expect(hosted).toHaveLength(1)
    expect(promptOf(hosted[0]?.body)).toBe(anglePromptsOf("turnaround")[0])
  })

  it("key each view from one key per press and keep each view that starts, so a refused view leaves the started ones in hand and a second press replays them", async () => {
    answerRunsWith((call) => {
      const view = viewOf(call)
      if (view === 2) {
        return json(400, { error: { code: "RUN_INPUT_INVALID", status: 400 } })
      }
      const id = viewRunIds[view - 1]
      return id === undefined
        ? null
        : json(202, { run: anglesRunOf(id, anglesEdit) })
    })
    const client = openAngles()
    const generate = await screen.findByRole("button", {
      name: pricedName(viewCredits * 4),
    })
    fireEvent.click(generate)
    await vi.waitFor(() => expect(startedBodies()).toHaveLength(4))
    const first = calls.filter((call) => viewOf(call) > 0)
    expect(first.map(viewOf).sort()).toEqual([1, 2, 3, 4])
    const presses = new Set(
      first.map((call) => call.key.replace(/-view-\d$/, ""))
    )
    expect(presses.size).toBe(1)
    expect([...presses][0]).toMatch(/^[0-9a-f-]{36}$/)
    await vi.waitFor(() =>
      expect(client.getQueryData(["run", viewRunIds[0]])).toBeDefined()
    )
    expect(client.getQueryData(["run", viewRunIds[2]])).toBeDefined()
    expect(
      await screen.findByText(t("error.RUN_INPUT_INVALID.title"), {
        exact: false,
      })
    ).toBeDefined()
    fireEvent.click(
      screen.getByRole("button", { name: pricedName(viewCredits * 4) })
    )
    await vi.waitFor(() => expect(startedBodies()).toHaveLength(8))
    const again = calls.filter((call) => viewOf(call) > 0).slice(4)
    expect(again.map((call) => call.key).sort()).toEqual(
      first.map((call) => call.key).sort()
    )
  })

  it("name the next step under the model when the picked model takes no photo, and start no run", async () => {
    openAngles({ model: counted })
    const note = await screen.findByText(tCatalog("video.well.none"))
    const generate = await findColumnGenerate()
    fireEvent.click(generate)
    expect(screen.queryByText(t("field.choice.required"))).toBeNull()
    expect(note.isConnected).toBe(true)
    expect(startedBodies()).toEqual([])
  })

  it("control: name no next step when the picked model takes a photo", async () => {
    openAngles()
    await screen.findByRole("button", { name: pricedName(viewCredits * 4) })
    expect(screen.queryByText(tCatalog("video.well.none"))).toBeNull()
  })

  it("keep Generate waiting while the character's photos load, and start no run", async () => {
    openAngles({ isCharacterRead: false })
    const generate = await findColumnGenerate()
    expect(generate.getAttribute("aria-busy")).toBe("true")
    fireEvent.click(generate)
    expect(startedBodies()).toEqual([])
  })
})

function anglesPriceModels(): unknown[] {
  return priceCalls()
    .filter((call) => {
      const { body } = call
      return (
        typeof body === "object" &&
        body !== null &&
        "inputs" in body &&
        typeof body.inputs === "object" &&
        body.inputs !== null &&
        "mode" in body.inputs &&
        body.inputs.mode === "angles"
      )
    })
    .map((call) => modelOf(call.body))
}

describe("a fresh Characters screen", () => {
  it("opens the angles on their own default graph, not on the text to image default", async () => {
    openCharacters()
    await screen.findByRole("button", { name: pricedName(graphCredits) })
    await vi.waitFor(() =>
      expect(anglesPriceModels().length).toBeGreaterThan(0)
    )
    expect(new Set(anglesPriceModels())).toEqual(new Set([qwenEdit.id]))
    expect(readLastUsed(characters.id)?.model).toBe(zImage.id)
  })
})
