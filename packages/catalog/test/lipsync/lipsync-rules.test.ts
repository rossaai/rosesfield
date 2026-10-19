import {
  type AppDefinition,
  inputRulesOf,
  startRunBodyFor,
} from "@rosesfield/contract"
import { describe, expect, it } from "vitest"
import { app } from "#lipsync/app"
import { readApps } from "#list-apps"

function parseLipsync(): AppDefinition {
  const [parsed] = readApps([{ folder: "lipsync", app }])
  if (parsed === undefined) {
    throw new Error("The lipsync app did not parse")
  }
  return parsed
}

const lipsync = parseLipsync()
const photoId = "6a7b8c9d-0e1f-4a2b-8c3d-4e5f6a7b8c9d"
const clipId = "7b8c9d0e-1f2a-4b3c-9d4e-5f6a7b8c9d0e"
const audioId = "8c9d0e1f-2a3b-4c4d-8e5f-6a7b8c9d0e1f"

function issuesOf(
  definition: AppDefinition,
  inputs: Record<string, unknown>
): string[] {
  const parsed = startRunBodyFor(definition).safeParse({ inputs })
  return parsed.success
    ? []
    : parsed.error.issues.map(
        (issue) => `${issue.path.join(".")}: ${issue.message}`
      )
}

function withoutModeRules(definition: AppDefinition): AppDefinition {
  return {
    ...definition,
    inputs: definition.inputs.map((input) => {
      if (input.type === "seed" || input.when === undefined) {
        return input
      }
      const { when: _, ...rest } = input
      return "presence" in rest ? { ...rest, presence: "optional" } : rest
    }),
  }
}

const refused: readonly {
  inputs: Record<string, unknown>
  issue: string
}[] = [
  {
    inputs: { mode: "photo", audio: [audioId], length: 5 },
    issue: "inputs.photo: photo is required when mode is photo",
  },
  {
    inputs: { mode: "clip", audio: [audioId], length: 5 },
    issue: "inputs.clip: clip is required when mode is clip",
  },
  {
    inputs: {
      mode: "clip",
      clip: [clipId],
      photo: [photoId],
      audio: [audioId],
      length: 5,
    },
    issue: "inputs.photo: photo applies only when mode is photo",
  },
  {
    inputs: {
      mode: "photo",
      photo: [photoId],
      clip: [clipId],
      audio: [audioId],
      length: 5,
    },
    issue: "inputs.clip: clip applies only when mode is clip",
  },
  {
    inputs: {
      mode: "clip",
      clip: [clipId],
      audio: [audioId],
      scene: "A beach at noon",
      length: 5,
    },
    issue: "inputs.scene: scene applies only when mode is photo",
  },
]

describe("the Lip sync modes in the contract", () => {
  it("applies the photo and the scene in From a photo, and the clip in From a clip", () => {
    const applied = (mode: string) =>
      inputRulesOf(lipsync, { mode }).map((rule) => rule.input.name)
    expect(applied("photo")).toEqual([
      "mode",
      "photo",
      "audio",
      "scene",
      "length",
      "seed",
    ])
    expect(applied("clip")).toEqual(["mode", "clip", "audio", "length", "seed"])
  })

  it.each(refused)("refuses $issue", ({ inputs, issue }) => {
    expect(issuesOf(lipsync, inputs)).toEqual([issue])
  })

  it("starts From a photo with a photo and From a clip with a clip, and fills the length", () => {
    const photoRun = startRunBodyFor(lipsync).parse({
      inputs: { mode: "photo", photo: [photoId], audio: [audioId] },
    })
    const clipRun = startRunBodyFor(lipsync).parse({
      inputs: { mode: "clip", clip: [clipId], audio: [audioId], length: 5 },
      aspectRatio: "9:16",
    })
    expect(photoRun.inputs).toEqual({
      mode: "photo",
      photo: [photoId],
      audio: [audioId],
      length: 10,
    })
    expect(clipRun.inputs).toEqual({
      mode: "clip",
      clip: [clipId],
      audio: [audioId],
      length: 5,
    })
  })
})

describe("the control of the mode refusals", () => {
  it("accepts every refused run once the definition drops its mode rules", () => {
    const planted = withoutModeRules(lipsync)
    expect(refused.map(({ inputs }) => issuesOf(planted, inputs))).toEqual(
      refused.map(() => [])
    )
  })
})
