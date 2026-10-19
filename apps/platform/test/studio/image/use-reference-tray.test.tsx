import type { ModelField } from "@rosesfield/catalog/comfy"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, renderHook } from "@testing-library/react"
import { type ReactNode, useCallback, useState } from "react"
import { afterEach, describe, expect, it } from "vitest"
import type { FieldValue } from "@/screens/app/app-form"
import type { AppForm } from "@/screens/app/use-app-form"
import { useReferenceTray } from "@/studio/image/use-reference-tray"

type MediaField = Extract<ModelField, { kind: "media" }>

function mediaField(name: string, max: number): MediaField {
  return {
    name,
    path: name,
    required: false,
    kind: "media",
    media: "image",
    min: 1,
    max,
  }
}

function wrapper({ children }: { children: ReactNode }): ReactNode {
  const client = new QueryClient({
    defaultOptions: { queries: { enabled: false, retry: false } },
  })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

function useTray(field: MediaField | null, start: readonly string[]) {
  const [inputs, setInputs] = useState<Record<string, FieldValue>>({
    images: [...start],
  })
  const setInput = useCallback((name: string, value: FieldValue) => {
    setInputs((current) => ({ ...current, [name]: value }))
  }, [])
  const form: AppForm = {
    values: { inputs, seedMode: "random", count: 1, aspectRatio: null },
    problems: new Map(),
    setInput,
    setForm: () => undefined,
    fill: () => undefined,
    validate: () => true,
    register: () => undefined,
  }
  return { tray: useReferenceTray(field, form), inputs, setInput }
}

afterEach(cleanup)

describe("the reference tray", () => {
  it("drops its limit message when the model's reference field changes", () => {
    const { result, rerender } = renderHook(
      ({ field }: { field: MediaField | null }) => useTray(field, ["a", "b"]),
      { wrapper, initialProps: { field: mediaField("images", 2) } }
    )
    act(() => result.current.tray.addAssets(["c"]))
    expect(result.current.tray.message).toBe(
      "This input takes up to 2. Remove one to add another."
    )
    rerender({ field: mediaField("image", 1) })
    expect(result.current.tray.message).toBeNull()
    rerender({ field: mediaField("images", 2) })
    expect(result.current.tray.message).toBeNull()
  })

  it("adds a finished upload to the references held when it ends, not when it began", () => {
    const { result } = renderHook(
      () => useTray(mediaField("images", 10), ["a"]),
      { wrapper }
    )
    const fromTheClick = result.current.tray.addAssets
    act(() => result.current.setInput("images", ["a", "b"]))
    act(() => fromTheClick(["c"]))
    expect(result.current.inputs.images).toEqual(["a", "b", "c"])
  })
})
