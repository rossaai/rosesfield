import {
  type AppDefinition,
  appDefinition,
  appListing,
  startRunBodyFor,
} from "@rosesfield/contract"
import { act, cleanup, renderHook } from "@testing-library/react"
import { useCallback, useState } from "react"
import { afterEach, describe, expect, it } from "vitest"
import { tCatalog } from "@/copy/t"
import { bodyOf, defaultsOf, type FieldValue } from "@/screens/app/app-form"
import type { AppForm } from "@/screens/app/use-app-form"
import { messageOf, useSoundRule } from "@/studio/shot/use-shot-screen"
import { app } from "../../../../../packages/catalog/src/shot/app"
import { shotProblems } from "../../../../../packages/catalog/src/shot/shot-models"

const definition: AppDefinition = appDefinition.parse(app)

const listing = appListing.parse(definition)
const frame = "4d2c1b0a-9e8f-4a6b-8c5d-3e2f1a0b9c8d"
const scene = "A boat leaves the harbor"

function useForm(first: Record<string, FieldValue>) {
  const [inputs, setInputs] = useState<Record<string, FieldValue>>({
    ...defaultsOf(listing).inputs,
    prompt: scene,
    ...first,
  })
  const setInput = useCallback((name: string, value: FieldValue) => {
    setInputs((current) => ({ ...current, [name]: value }))
  }, [])
  const form: AppForm = {
    values: { inputs, seedMode: "random", count: 1, aspectRatio: "16:9" },
    problems: new Map(),
    setInput,
    setForm: () => undefined,
    fill: () => undefined,
    validate: () => true,
    register: () => undefined,
  }
  return { form, hasSound: useSoundRule(listing, form) }
}

function isAccepted(form: AppForm): boolean {
  return startRunBodyFor(definition).safeParse(bodyOf(listing, form.values))
    .success
}

afterEach(() => {
  cleanup()
})

describe("the Shot screen and the contract refuse the same runs", () => {
  it("drops sound on the camera model, so the body the screen sends passes", () => {
    const { result } = renderHook(() =>
      useForm({ model: "wan-2-2-fun-camera", resolution: "480p" })
    )
    act(() => result.current.form.setInput("startFrame", [frame]))
    expect(result.current.hasSound).toBe(false)
    expect(result.current.form.values.inputs.sound).toBeUndefined()
    expect(shotProblems(listing, result.current.form.values.inputs)).toEqual([])
    expect(isAccepted(result.current.form)).toBe(true)
  })

  it("brings sound back on ltx-2-5 with its default", () => {
    const { result } = renderHook(() =>
      useForm({ model: "wan-2-2-fun-camera", resolution: "480p" })
    )
    act(() => result.current.form.setInput("model", "ltx-2-5"))
    act(() => result.current.form.setInput("resolution", "720p"))
    expect(result.current.hasSound).toBe(true)
    expect(result.current.form.values.inputs.sound).toBe("on")
    expect(isAccepted(result.current.form)).toBe(true)
  })

  it("finds a problem wherever the contract refuses the body", () => {
    const cases: Record<string, FieldValue>[] = [
      {},
      { startFrame: [frame] },
      { model: "wan-2-2-fun-camera", resolution: "480p" },
      { model: "wan-2-2-fun-camera", resolution: "480p", startFrame: [frame] },
      {
        model: "wan-2-2-fun-camera",
        resolution: "480p",
        startFrame: [frame],
        movement: "pan-left",
      },
    ]
    for (const first of cases) {
      const { result, unmount } = renderHook(() => useForm(first))
      const problems = shotProblems(listing, result.current.form.values.inputs)
      expect(problems.length === 0).toBe(isAccepted(result.current.form))
      unmount()
    }
  })
})

describe("the messages under each field", () => {
  it("puts the start frame message on the frame, ahead of the movement", () => {
    const inputs = {
      ...defaultsOf(listing).inputs,
      prompt: scene,
      model: "wan-2-2-fun-camera",
      movement: "pan-left",
    }
    const problems = shotProblems(listing, inputs)
    expect(problems.map((problem) => problem.input)).toEqual([
      "startFrame",
      "movement",
      "resolution",
    ])
    const [first] = problems
    expect(first === undefined ? null : messageOf(listing, first)).toBe(
      tCatalog("shot.input.startFrame.required")
    )
  })

  it("names ltx-2-5 when it is given a start frame it does not read", () => {
    const inputs = {
      ...defaultsOf(listing).inputs,
      prompt: scene,
      startFrame: [frame],
    }
    const [problem] = shotProblems(listing, inputs)
    expect(problem === undefined ? null : messageOf(listing, problem)).toBe(
      tCatalog("shot.input.startFrame.unread", {
        model: tCatalog("shot.model.ltx25.name"),
      })
    )
  })
})
