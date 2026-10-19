import {
  type AppListing,
  type Asset,
  appListing,
  asset,
} from "@rosesfield/contract"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import { type ReactNode, useCallback, useState } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { assetQuery } from "@/api/queries"
import type { FieldValue, FormValues } from "@/screens/app/app-form"
import type { AppForm } from "@/screens/app/use-app-form"
import type { StartRun } from "@/screens/app/use-start-run"
import { useCheckedStart } from "@/studio/effects/use-checked-start"
import { useRelightPhoto } from "@/studio/relight/use-relight-photo"
import { assetIds } from "../../sample-app"

const photoId = assetIds[0] ?? ""

function relightApp(): AppListing {
  return appListing.parse({
    id: "relight",
    nameKey: "relight.name",
    category: "image",
    inputs: [
      {
        type: "image",
        name: "image",
        labelKey: "relight.input.image.label",
        presence: "required",
        max: 1,
      },
    ],
    output: {
      kind: "image",
      count: { default: 1, max: 4 },
      aspectRatios: { options: ["1:1", "3:2", "2:3"], default: "1:1" },
    },
    limits: { timeoutSeconds: 600, maxRetries: 2 },
    preview: null,
  })
}

function storedPhoto(width: number, height: number): Asset {
  return asset.parse({
    id: photoId,
    kind: "image",
    mime: "image/png",
    bytes: 2_000_000,
    width,
    height,
    durationSeconds: null,
    sourceRunId: null,
    createdAt: "2026-10-17T09:00:00.000Z",
  })
}

function useScreen(app: AppListing, generate: () => void, refused: () => void) {
  const [values, setValues] = useState<FormValues>({
    inputs: { image: [photoId] },
    seedMode: "random",
    count: 1,
    aspectRatio: "1:1",
  })
  const setInput = useCallback((name: string, value: FieldValue) => {
    setValues((current) => ({
      ...current,
      inputs: { ...current.inputs, [name]: value },
    }))
  }, [])
  const setForm = useCallback((change: Partial<FormValues>) => {
    setValues((current) => ({ ...current, ...change }))
  }, [])
  const photo = values.inputs.image
  const form: AppForm = {
    values,
    problems: new Map(),
    setInput,
    setForm,
    fill: () => undefined,
    validate: () => Array.isArray(photo) && photo.length > 0,
    register: () => undefined,
  }
  const relight = useRelightPhoto(app, form)
  const start: StartRun = { generate, isPending: false, error: null, price: "" }
  const checked = useCheckedStart(start, form, relight.isReady, refused)
  return { values, relight, checked }
}

function renderScreen(asset: Asset) {
  const client = new QueryClient()
  client.setQueryData(assetQuery(photoId).queryKey, { asset })
  const spies = { generate: vi.fn(), refused: vi.fn() }
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  const rendered = renderHook(
    () => useScreen(relightApp(), spies.generate, spies.refused),
    { wrapper }
  )
  return { ...rendered, spies }
}

afterEach(() => {
  cleanup()
})

describe("the Relight photo check with no photo field on screen", () => {
  it("refuses a photo of 200 by 200 pixels placed in the form, and starts no run", async () => {
    const { result, spies } = renderScreen(storedPhoto(200, 200))
    await waitFor(() => expect(result.current.relight.message).not.toBeNull())
    expect(result.current.relight.message).toContain("200 by 200")
    expect(result.current.values.inputs.image).toEqual([])
    act(() => result.current.checked.generate())
    expect(spies.generate).not.toHaveBeenCalled()
    expect(spies.refused).toHaveBeenCalledTimes(1)
  })

  it("refuses a photo of 600 by 2,000 pixels placed in the form, and starts no run", async () => {
    const { result, spies } = renderScreen(storedPhoto(600, 2000))
    await waitFor(() => expect(result.current.relight.message).not.toBeNull())
    expect(result.current.values.inputs.image).toEqual([])
    act(() => result.current.checked.generate())
    expect(spies.generate).not.toHaveBeenCalled()
  })

  it("sets the ratio nearest the photo before the run starts", async () => {
    const { result, spies } = renderScreen(storedPhoto(3000, 2000))
    act(() => result.current.checked.generate())
    await waitFor(() => expect(spies.generate).toHaveBeenCalledTimes(1))
    expect(result.current.values.aspectRatio).toBe("3:2")
    expect(result.current.relight.photoSize).toEqual({
      width: 3000,
      height: 2000,
    })
    expect(result.current.relight.message).toBeNull()
  })
})
