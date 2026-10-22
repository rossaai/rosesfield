import { type Run, run } from "@rosesfield/contract"
import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import { useCallback, useEffect, useState } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { FieldValue } from "@/screens/app/app-form"
import type { AppForm } from "@/screens/app/use-app-form"
import { useEffectAgain } from "@/studio/effects/use-effect-again"

const photoId = "0a1b2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c01"

const done: Run = run.parse({
  id: "1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e01",
  appId: "effects",
  status: "done",
  inputs: { effect: "grow-giant", image: [photoId], resolution: "480p" },
  count: 1,
  aspectRatio: "9:16",
  seed: 7,
  outputs: ["0a1b2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c02"],
  progress: null,
  engine: { adapter: "comfy-workflow", models: [], workflowHash: null },
  cost: null,
  origin: "live",
  failure: null,
  createdAt: "2026-10-19T09:00:00.000Z",
  finishedAt: "2026-10-19T09:01:00.000Z",
})

type Spies = {
  photoFocus: () => void
  effectFocus: () => void
  openInputs: () => void
  onNewPhoto: () => void
}

function focusable(): () => void {
  const target = document.createElement("button")
  document.body.append(target)
  return vi.fn(() => target.focus())
}

function spies(): Spies {
  return {
    photoFocus: focusable(),
    effectFocus: focusable(),
    openInputs: vi.fn(),
    onNewPhoto: vi.fn(),
  }
}

function useScreen(given: Spies) {
  const [inputs, setInputs] = useState<Record<string, FieldValue>>({})
  const setInput = useCallback((name: string, value: FieldValue) => {
    setInputs((current) => ({ ...current, [name]: value }))
  }, [])
  const fill = useCallback((filled: Run) => {
    setInputs({ ...filled.inputs })
  }, [])
  const form: AppForm = {
    values: { inputs, seedMode: "random", count: 1, aspectRatio: "9:16" },
    problems: new Map(),
    setInput,
    setForm: () => undefined,
    fill: () => undefined,
    validate: () => true,
    register: () => undefined,
  }
  const again = useEffectAgain({
    form,
    fill,
    openInputs: given.openInputs,
    onNewPhoto: given.onNewPhoto,
  })
  const { register } = again.form
  useEffect(() => {
    register("image", given.photoFocus)
    register("effect", given.effectFocus)
  }, [register, given])
  return { inputs, again }
}

afterEach(() => {
  cleanup()
  document.body.replaceChildren()
})

describe("running an effect again from a result", () => {
  it("keeps the effect, clears the photo and asks for another photo in one press", () => {
    const given = spies()
    const { result } = renderHook(() => useScreen(given))
    act(() => result.current.again.onAnotherPhoto(done))
    expect(result.current.inputs).toMatchObject({
      effect: "grow-giant",
      image: [],
      resolution: "480p",
    })
    expect(given.onNewPhoto).toHaveBeenCalledOnce()
    expect(given.openInputs).toHaveBeenCalledOnce()
    expect(given.photoFocus).toHaveBeenCalledOnce()
    expect(given.effectFocus).not.toHaveBeenCalled()
  })

  it("keeps the photo and moves to the effects in one press", () => {
    const given = spies()
    const { result } = renderHook(() => useScreen(given))
    act(() => result.current.again.onAnotherEffect(done))
    expect(result.current.inputs).toMatchObject({
      effect: "grow-giant",
      image: [photoId],
    })
    expect(given.onNewPhoto).not.toHaveBeenCalled()
    expect(given.effectFocus).toHaveBeenCalledOnce()
    expect(given.photoFocus).not.toHaveBeenCalled()
  })

  it("focuses the photo once its field registers after the press, as when the input sheet opens", async () => {
    const given = spies()
    const late = focusable()
    const { result } = renderHook(() => useScreen(given))
    const { register } = result.current.again.form
    act(() => register("image", () => undefined))
    act(() => result.current.again.onAnotherPhoto(done))
    act(() => register("image", late))
    await waitFor(() => expect(late).toHaveBeenCalled())
  })
})
