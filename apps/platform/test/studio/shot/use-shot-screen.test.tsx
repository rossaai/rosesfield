import { findApp } from "@rosesfield/catalog"
import type { CatalogModel } from "@rosesfield/catalog/comfy"
import { appListing, type Run, run } from "@rosesfield/contract"
import { act, cleanup, renderHook } from "@testing-library/react"
import { useCallback, useState } from "react"
import { afterEach, describe, expect, it } from "vitest"
import type { FieldValue, FormValues } from "@/screens/app/app-form"
import { catalogRowsOf } from "@/screens/app/hosted/catalog-picker"
import type { HostedState } from "@/screens/app/hosted/use-hosted-model"
import type { AppForm } from "@/screens/app/use-app-form"
import { choicesOf, sceneInput, wordsOf } from "@/studio/shot/shot-prompt"
import {
  chooseKeeping,
  keepScene,
  sceneOfRun,
  shotPickerOf,
  startSlotOf,
  useWordsInPrompt,
} from "@/studio/shot/use-shot-screen"
import { videoFieldsOf } from "@/studio/video/video-fields"
import { h3MaxTurbo, minimaxH3 } from "../video/video-forms"

afterEach(cleanup)

const shot = appListing.parse(findApp("shot"))
const scene = "A boat leaves the harbor"

function useFakeForm(first: Record<string, FieldValue>): AppForm {
  const [values, setValues] = useState<FormValues>({
    inputs: first,
    seedMode: "random",
    count: 1,
    aspectRatio: "16:9",
  })
  const setInput = useCallback((name: string, value: FieldValue) => {
    setValues((current) => ({
      ...current,
      inputs: { ...current.inputs, [name]: value },
    }))
  }, [])
  return {
    values,
    problems: new Map(),
    setInput,
    setForm: (change) => setValues((current) => ({ ...current, ...change })),
    fill: setValues,
    validate: () => true,
    register: () => undefined,
  }
}

function useShotForm(first: Record<string, FieldValue>) {
  const form = useFakeForm(first)
  useWordsInPrompt(form, "prompt", null)
  const choose = chooseKeeping(form, "prompt", (id) =>
    form.setForm({ inputs: { model: id } })
  )
  return { form, choose }
}

function model(id: string, form: CatalogModel["form"]): CatalogModel {
  return {
    id,
    kind: form === null ? "graph" : "hosted",
    maker: form === null ? "comfy-cloud" : "MiniMax",
    name: id,
    nameKey: null,
    task: "text-to-video",
    tags: form === null ? [{ kind: "open-weights" }] : [],
    form,
  }
}

const ltx = model("ltx-2-5", null)
const minimax = model("minimax/minimax-h3", [...minimaxH3])
const turbo = model("fal/h3-max-turbo", [...h3MaxTurbo])

function hostedOf(models: readonly CatalogModel[]): HostedState {
  return {
    isTaskApp: true,
    models,
    isLoading: false,
    error: null,
    keyState: "set",
    defaultModel: "ltx-2-5",
    chosen: models[0] ?? null,
    fields: null,
    choose: () => undefined,
  }
}

function runOf(inputs: Record<string, string | number | string[]>): Run {
  return run.parse({
    id: "d05cd6d3-5a6b-4c7d-8e9f-0a1b2c3d4e01",
    appId: "shot",
    status: "done",
    inputs,
    count: 1,
    aspectRatio: "16:9",
    seed: 4242,
    outputs: ["0a1b2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c01"],
    progress: null,
    engine: { adapter: "comfy-workflow", models: [], workflowHash: null },
    cost: null,
    origin: "live",
    failure: null,
    createdAt: "2026-10-20T09:00:00.000Z",
    finishedAt: "2026-10-20T09:01:00.000Z",
  })
}

describe("the words under the prompt are the prompt Shot sends", () => {
  it("writes the scene and each picked choice into the prompt, and Auto adds none", () => {
    const { result } = renderHook(() => useShotForm({ prompt: "" }))
    act(() => result.current.form.setInput(sceneInput, scene))
    expect(result.current.form.values.inputs.prompt).toBe(`${scene}.`)
    act(() => result.current.form.setInput("light", "night"))
    expect(result.current.form.values.inputs.prompt).toBe(
      `${scene}. Night lighting.`
    )
    act(() => result.current.form.setInput("light", "auto"))
    expect(result.current.form.values.inputs.prompt).toBe(`${scene}.`)
  })

  it("reads the scene and choices back from a prompt the form opens with", () => {
    const words = wordsOf(scene, choicesOf({ movement: "pull-out" }))
    const { result } = renderHook(() => useShotForm({ prompt: words }))
    expect(result.current.form.values.inputs[sceneInput]).toBe(`${scene}.`)
    expect(result.current.form.values.inputs.movement).toBe("pull-out")
    expect(result.current.form.values.inputs.prompt).toBe(words)
  })
})

describe("picking another model", () => {
  it("keeps your scene and shot choices when the new model's form replaces the inputs", () => {
    const { result } = renderHook(() => useShotForm({ prompt: "" }))
    act(() => {
      result.current.form.setInput(sceneInput, scene)
      result.current.form.setInput("color", "sepia")
      result.current.form.setInput("mood", "calm")
    })
    act(() => result.current.choose("fal/h3-max-turbo"))
    const { inputs } = result.current.form.values
    expect(inputs.model).toBe("fal/h3-max-turbo")
    expect(inputs[sceneInput]).toBe(scene)
    expect(inputs.color).toBe("sepia")
    expect(inputs.mood).toBe("calm")
    expect(inputs.prompt).toBe(
      `${scene}. Sepia tones, like an old photograph. A calm mood.`
    )
  })

  it("hides the start frame well on a model whose schema takes no start frame", () => {
    expect(startSlotOf(shot, videoFieldsOf(h3MaxTurbo), false)).toBeNull()
    expect(startSlotOf(shot, videoFieldsOf(minimaxH3), false)).toEqual({
      name: "firstFrame",
      max: 1,
    })
    expect(startSlotOf(shot, null, true)).toEqual({
      name: "startFrame",
      max: 1,
    })
  })
})

describe("the model picker", () => {
  it("ranks the default LTX 2.5 first and keeps MiniMax H3 in the ranked three", () => {
    const picker = shotPickerOf(hostedOf([ltx, turbo, minimax]), shot)
    expect(catalogRowsOf(picker.models).map((row) => row.id)).toEqual([
      "ltx-2-5",
      "fal/h3-max-turbo",
      "minimax/minimax-h3",
    ])
  })

  it("gives the graph its top resolution and length range from Shot's inputs", () => {
    const picker = shotPickerOf(hostedOf([ltx]), shot)
    const kinds = picker.models[0]?.tags.map((tag) => tag.kind)
    expect(kinds).toEqual(
      expect.arrayContaining(["open-weights", "resolution", "length"])
    )
  })
})

describe("Use these inputs", () => {
  it("reads a run's scene and choices from the words it sent", () => {
    const words = wordsOf(
      scene,
      choicesOf({ movement: "push-in", color: "black-and-white" })
    )
    const read = sceneOfRun(runOf({ model: "ltx-2-5", prompt: words }), [ltx])
    expect(read.scene).toBe(`${scene}.`)
    expect(read.choices.movement).toBe("push-in")
    expect(read.choices.color).toBe("black-and-white")
    expect(read.choices.light).toBe("auto")
  })

  it("reads the prompt field the run's hosted model names", () => {
    const words = wordsOf(scene, choicesOf({ lens: "macro" }))
    const read = sceneOfRun(
      runOf({ model: "minimax/minimax-h3", prompt: words }),
      [ltx, minimax]
    )
    expect(read.choices.lens).toBe("macro")
  })

  it("fills the form without starting a run, and the words stay those of the run", () => {
    const words = wordsOf(scene, choicesOf({ focus: "deep" }))
    const { result } = renderHook(() => useShotForm({ prompt: "" }))
    const ran = runOf({ model: "ltx-2-5", prompt: words, seed: 4242 })
    act(() => {
      result.current.form.fill({
        inputs: { ...ran.inputs },
        seedMode: "fixed",
        count: 1,
        aspectRatio: "16:9",
      })
      keepScene(result.current.form, sceneOfRun(ran, [ltx]))
    })
    const { inputs } = result.current.form.values
    expect(inputs.focus).toBe("deep")
    expect(inputs.seed).toBe(4242)
    expect(inputs.prompt).toBe(words)
  })
})
