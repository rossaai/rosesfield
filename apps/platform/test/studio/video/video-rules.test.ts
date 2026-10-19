import {
  type AppDefinition,
  appDefinition,
  appListing,
  startRunBodyFor,
} from "@rosesfield/contract"
import { describe, expect, it } from "vitest"
import {
  bodyOf,
  defaultsOf,
  type FieldValue,
  type FormValues,
} from "@/screens/app/app-form"
import { clipCheckOf } from "@/studio/video/use-attached-facts"
import { ruleFixes, rulesOf, shownInput } from "@/studio/video/video-rules"
import { app as videoInput } from "../../../../../packages/catalog/src/video/app"

const definition: AppDefinition = appDefinition.parse(videoInput)
const listing = appListing.parse(definition)
const frame = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d"
const clip = "2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e"

function settled(change: Record<string, FieldValue>): FormValues {
  const base = defaultsOf(listing)
  let inputs = { ...base.inputs, prompt: "a fox in deep snow", ...change }
  for (let pass = 0; pass < 4; pass += 1) {
    inputs = { ...inputs, ...ruleFixes(listing, inputs) }
  }
  return { ...base, inputs }
}

function shownNames(values: FormValues): string[] {
  const rules = rulesOf(listing, values.inputs)
  return listing.inputs.flatMap((input) =>
    shownInput(input, rules) === null ? [] : [input.name]
  )
}

describe("the Video screen reads the contract's rules", () => {
  it.each([
    { name: "a prompt", change: {} },
    { name: "a start frame", change: { startFrame: [frame] } },
    { name: "a clip", change: { clip: [clip] } },
    {
      name: "Wan 2.2 with sound on",
      change: { model: "wan-2-2", sound: "on" },
    },
    {
      name: "Wan 2.2 at 720p from a start frame",
      change: { model: "wan-2-2", resolution: "720p", startFrame: [frame] },
    },
    {
      name: "a clip with a camera move on Auto",
      change: { clip: [clip], cameraMove: "push-in", model: "auto" },
    },
  ])("sends $name in a body the gateway takes", ({ change }) => {
    const body = bodyOf(listing, settled(change))
    const result = startRunBodyFor(definition).safeParse(body)
    expect(result.error?.issues ?? []).toEqual([])
  })

  it("moves a clip to Wan 2.2 at 480p with no sound and no camera move", () => {
    const values = settled({ clip: [clip], sound: "on" })
    expect(values.inputs).toMatchObject({
      model: "wan-2-2",
      resolution: "480p",
    })
    expect(values.inputs.sound).toBeUndefined()
    expect(values.inputs.cameraMove).toBeUndefined()
    expect(shownNames(values)).not.toContain("cameraMove")
    expect(shownNames(values)).not.toContain("sound")
    expect(shownNames(values)).not.toContain("resolution")
  })

  it("brings the sound switch and the camera move back on LTX 2.5", () => {
    const wan = settled({ model: "wan-2-2" })
    const back = settled({ ...wan.inputs, model: "ltx-2-5" })
    expect(back.inputs).toMatchObject({ sound: "off", cameraMove: "auto" })
    expect(shownNames(back)).toEqual(
      expect.arrayContaining(["sound", "resolution", "cameraMove", "model"])
    )
  })

  it("leaves a clip and a start frame for the gateway to refuse", () => {
    const values = settled({ clip: [clip], startFrame: [frame] })
    expect(values.inputs).toMatchObject({ clip: [clip], startFrame: [frame] })
    const result = startRunBodyFor(definition).safeParse(
      bodyOf(listing, values)
    )
    expect(result.success).toBe(false)
  })
})

describe("the clip check", () => {
  it.each([
    { seconds: 2, length: 2 },
    { seconds: 4.4, length: 4 },
    { seconds: 5.06, length: 5 },
  ])("sets the length of a clip of $seconds seconds to $length", (row) => {
    expect(clipCheckOf(row.seconds)).toEqual({
      kind: "fits",
      length: row.length,
    })
  })

  it.each([
    { seconds: 8, key: "field.asset.tooLong" },
    { seconds: 6, key: "field.asset.tooLong" },
    { seconds: 1.5, key: "field.asset.tooShort" },
  ])("refuses a clip of $seconds seconds with $key", ({ seconds, key }) => {
    const check = clipCheckOf(seconds)
    expect(check.kind === "refused" ? check.problem.key : null).toBe(key)
  })
})
