import { appDefinition, appListing } from "@rosesfield/contract"
import { act, cleanup, renderHook } from "@testing-library/react"
import { useCallback, useState } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { defaultsOf, type FieldValue } from "@/screens/app/app-form"
import type { AppForm } from "@/screens/app/use-app-form"
import type { AppScreenState } from "@/screens/app/use-app-screen"
import { useShotScreen } from "@/studio/shot/use-shot-screen"
import { app } from "../../../../../packages/catalog/src/shot/app"

const listing = appListing.parse(appDefinition.parse(app))
const frame = "4d2c1b0a-9e8f-4a6b-8c5d-3e2f1a0b9c8d"
const scene = "A boat leaves the harbor"
const seeds = { use: undefined, from: undefined }

const first = vi.hoisted(() => ({ inputs: {} as Record<string, unknown> }))
const started = vi.hoisted(() => ({ count: 0 }))

vi.mock("@/screens/app/use-app-screen", () => ({
  useAppScreen: (): AppScreenState => {
    const [inputs, setInputs] = useState<Record<string, FieldValue>>({
      ...defaultsOf(listing).inputs,
      prompt: scene,
      ...(first.inputs as Record<string, FieldValue>),
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
    return {
      form,
      start: {
        generate: () => {
          started.count += 1
        },
        isPending: false,
        error: null,
        price: "",
      },
      lastSeed: null,
      hasRuns: false,
      useInputs: () => undefined,
      onShortcut: () => undefined,
    }
  },
}))

function renderShot(inputs: Record<string, FieldValue>) {
  first.inputs = inputs
  started.count = 0
  const events = { onStarted: vi.fn(), onRefused: vi.fn() }
  const view = renderHook(() => useShotScreen(listing, seeds, events))
  return { ...view, events }
}

afterEach(() => {
  cleanup()
})

describe("a refused Generate reaches the person", () => {
  it.each([
    { name: "no start frame", inputs: { model: "wan-2-2-fun-camera" } },
    {
      name: "pan-left",
      inputs: {
        model: "wan-2-2-fun-camera",
        resolution: "480p",
        startFrame: [frame],
        movement: "pan-left",
      },
    },
  ])(
    "calls onRefused for $name on wan-2-2-fun-camera and starts no run",
    ({ inputs }) => {
      const { result, events } = renderShot(inputs)
      act(() => result.current.start.generate())
      expect(events.onRefused).toHaveBeenCalledTimes(1)
      expect(started.count).toBe(0)
      expect(result.current.messages.size).toBeGreaterThan(0)
    }
  )

  it("focuses the first wrong field once the panel mounts it", () => {
    const { result } = renderShot({ model: "wan-2-2-fun-camera" })
    act(() => result.current.start.generate())
    const focus = vi.fn()
    act(() => result.current.register("startFrame")(focus))
    expect(focus).toHaveBeenCalledTimes(1)
    act(() => result.current.register("startFrame")(focus))
    expect(focus).toHaveBeenCalledTimes(1)
  })

  it("starts a run and calls no onRefused when the shot holds", () => {
    const { result, events } = renderShot({})
    act(() => result.current.start.generate())
    expect(started.count).toBe(1)
    expect(events.onRefused).not.toHaveBeenCalled()
  })
})
