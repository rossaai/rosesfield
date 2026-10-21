import {
  type AppDefinition,
  appDefinition,
  appListing,
  run,
  startRunBodyFor,
} from "@rosesfield/contract"
import { QueryClient } from "@tanstack/react-query"
import { afterEach, describe, expect, it, vi } from "vitest"
import { assetQuery, characterQuery } from "@/api/queries"
import { appsTaking } from "@/catalog/app-facts"
import { t } from "@/copy/t"
import {
  bodyOf,
  defaultsOf,
  type FormValues,
  problemsOf,
  valuesFromRun,
} from "@/screens/app/app-form"
import { placeAll } from "@/screens/app/form-fill"
import { problemOf } from "@/studio/remake/use-remake-screen"
import { app } from "../../../../../packages/catalog/src/remake/remake-app"
import { checkShots } from "../../../../../packages/catalog/src/remake/shot-plan"

const megabyte = 1024 * 1024
const editId = "0b1c2d3e-4f50-4a6b-8c7d-9e0f1a2b3c4d"
const characterId = "2d3e4f50-6172-4c8d-8e9f-1a2b3c4d5e6f"

const definition: AppDefinition = appDefinition.parse(app)
const listing = appListing.parse(definition)

function filled(inputs: Record<string, string | number | string[]>) {
  const defaults = defaultsOf(listing)
  return { ...defaults, inputs: { ...defaults.inputs, ...inputs } }
}

function isAccepted(values: FormValues): boolean {
  const body = bodyOf(listing, values)
  return startRunBodyFor(definition).safeParse(body).success
}

describe("the Remake form checks the reference edit before Generate", () => {
  it("takes an edit of 2 to 12 seconds up to 100 MB", () => {
    expect(problemOf({ seconds: 2 }, 100 * megabyte)).toBeUndefined()
    expect(problemOf({ seconds: 10 }, 40 * megabyte)).toBeUndefined()
    expect(problemOf({ seconds: 12 }, null)).toBeUndefined()
  })

  it("refuses an edit of 14 seconds with the platform's too long message", () => {
    expect(problemOf({ seconds: 14 }, megabyte)).toMatchObject({
      name: "reference",
      key: "field.asset.tooLong",
      values: { max: 12 },
    })
  })

  it("refuses an edit under 2 seconds and one over 100 MB", () => {
    expect(problemOf({ seconds: 1.5 }, megabyte)?.key).toBe(
      "field.asset.tooShort"
    )
    expect(problemOf({ seconds: 10 }, 100 * megabyte + 1)?.key).toBe(
      "field.asset.tooLarge"
    )
  })
})

describe("the Remake form reads a reference's length as the run does", () => {
  const words = (reference: { seconds: number }): string | null => {
    const problem = problemOf(reference, megabyte)
    return problem === undefined ? null : t(problem.key, problem.values)
  }

  it("takes 360 frames at 29.97 frames per second, 12.012 seconds, and one of 1.98 seconds", () => {
    expect(problemOf({ seconds: 360 / 29.97 }, megabyte)).toBeUndefined()
    expect(problemOf({ seconds: 12.02 }, megabyte)).toBeUndefined()
    expect(problemOf({ seconds: 1.98 }, megabyte)).toBeUndefined()
  })

  it("refuses a length past the nearest frame at 24 frames per second, with a figure that shows why", () => {
    expect(words({ seconds: 12.03 })).toBe(
      "This clip runs 12.1 seconds. Pick one of 12 seconds or less."
    )
    expect(words({ seconds: 1.97 })).toBe(
      "This clip runs 1.9 seconds. Pick one of 2 seconds or more."
    )
  })

  it("agrees with the run's shot check on the same edit", () => {
    const shots = (end: number) => [
      { number: 1, startSeconds: 0, endSeconds: 4 },
      { number: 2, startSeconds: 4, endSeconds: 8 },
      { number: 3, startSeconds: 8, endSeconds: end },
    ]
    for (const end of [360 / 29.97, 12.02]) {
      expect(problemOf({ seconds: end }, megabyte)).toBeUndefined()
      expect(checkShots(shots(end))).toBeNull()
    }
    expect(problemOf({ seconds: 12.05 }, megabyte)?.key).toBe(
      "field.asset.tooLong"
    )
    expect(checkShots(shots(12.05))).toMatchObject({ code: "editLength" })
  })
})

describe("Use in, then Remake", () => {
  const video = {
    id: editId,
    kind: "video",
    mime: "video/mp4",
    bytes: megabyte,
    width: 1080,
    height: 1920,
    durationSeconds: 10,
    sourceRunId: null,
    createdAt: "2026-10-21T09:00:00.000Z",
  }

  function clientWithLibrary(): QueryClient {
    const client = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: Number.POSITIVE_INFINITY },
      },
    })
    client.setQueryData(assetQuery(editId).queryKey, { asset: video })
    client.setQueryData(characterQuery(characterId).queryKey, {
      character: { id: characterId },
    })
    return client
  }

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("offers Remake for a character and for a video", () => {
    expect(appsTaking([listing], "character").map((one) => one.id)).toEqual([
      "remake",
    ])
    expect(appsTaking([listing], "video").map((one) => one.id)).toEqual([
      "remake",
    ])
    expect(appsTaking([listing], "image")).toEqual([])
  })

  it("puts a character in the Character well and a video in the Reference edit well", async () => {
    vi.stubGlobal("fetch", () => Promise.reject(new Error("offline")))
    const client = clientWithLibrary()
    const withCharacter = await placeAll(
      client,
      listing,
      defaultsOf(listing),
      [characterId]
    )
    expect(withCharacter.inputs).toMatchObject({ character: [characterId] })
    expect(withCharacter.inputs.reference).toEqual([])
    const withVideo = await placeAll(client, listing, defaultsOf(listing), [
      editId,
    ])
    expect(withVideo.inputs).toMatchObject({ reference: [editId] })
    expect(withVideo.inputs.character).toEqual([])
  })
})

describe("the Remake form sends what the contract takes", () => {
  it("sends both wells and the defaults as a body the contract accepts", () => {
    const values = filled({ reference: [editId], character: [characterId] })
    expect(problemsOf(listing, values)).toEqual([])
    expect(bodyOf(listing, values)).toEqual({
      inputs: {
        reference: [editId],
        character: [characterId],
        otherShots: "rebuild",
        keepSound: "on",
        quality: "draft",
      },
      aspectRatio: "16:9",
    })
    expect(isAccepted(values)).toBe(true)
  })

  it("flags an empty character well, and the contract refuses the same body", () => {
    const values = filled({ reference: [editId] })
    expect(problemsOf(listing, values).map((problem) => problem.key)).toEqual([
      "field.character.required",
    ])
    expect(isAccepted(values)).toBe(false)
  })

  it("fills every input and the seed back from a run", () => {
    const values = valuesFromRun(
      listing,
      run.parse({
        id: "3f2e1d0c-9b8a-4776-a655-443322110000",
        appId: "remake",
        status: "done",
        inputs: {
          reference: [editId],
          character: [characterId],
          instructions: "Warm light.",
          otherShots: "keep",
          keepSound: "off",
          quality: "final",
          seed: 7,
        },
        count: 1,
        aspectRatio: "9:16",
        seed: 7,
        outputs: [],
        progress: null,
        engine: { adapter: "demo", models: [], workflowHash: null },
        cost: null,
        origin: "demo",
        failure: null,
        createdAt: "2026-10-17T09:00:00.000Z",
        finishedAt: "2026-10-17T09:00:03.000Z",
      })
    )
    expect(values).toMatchObject({
      seedMode: "fixed",
      aspectRatio: "9:16",
      inputs: {
        instructions: "Warm light.",
        otherShots: "keep",
        keepSound: "off",
        quality: "final",
        seed: 7,
      },
    })
    expect(isAccepted(values)).toBe(true)
  })
})
