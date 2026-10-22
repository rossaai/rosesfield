import type { AppListing } from "@rosesfield/contract"
import {
  CancelledError,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query"
import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import { type ReactNode, useCallback, useState } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { assetQuery } from "@/api/queries"
import { findCatalogApp } from "@/catalog/catalog-apps"
import { formatBytes } from "@/copy/format"
import { t, tCatalog } from "@/copy/t"
import type { FieldValue } from "@/screens/app/app-form"
import type { AppForm } from "@/screens/app/use-app-form"
import type { StartRun } from "@/screens/app/use-start-run"
import { useCheckedStart } from "@/studio/effects/use-checked-start"
import {
  acceptOf,
  type CheckPhoto,
  type PhotoCheck,
  photoCheckOf,
  usePhotoChecks,
} from "@/studio/effects/use-photo-checks"

vi.mock("@/api/call-route", () => ({
  callRoute: async () => new Blob([new Uint8Array(8)], { type: "image/png" }),
}))

type Pending = { assetId: string; answer: (check: PhotoCheck) => void }

function checksAnsweredByHand(): { check: CheckPhoto; pending: Pending[] } {
  const pending: Pending[] = []
  const check: CheckPhoto = (_client, assetId) =>
    new Promise((resolve, reject) => {
      pending.push({
        assetId,
        answer: (found) =>
          "refusal" in found && found.refusal === "lost"
            ? reject(new Error("lost"))
            : resolve(found),
      })
    })
  return { check, pending }
}

type Spies = { generate: () => void; refused: () => void }

function useScreen(check: CheckPhoto, first: string[], spies: Spies) {
  const [inputs, setInputs] = useState<Record<string, FieldValue>>({
    image: first,
  })
  const setInput = useCallback((name: string, value: FieldValue) => {
    setInputs((current) => ({ ...current, [name]: value }))
  }, [])
  const photo = inputs.image
  const form: AppForm = {
    values: { inputs, seedMode: "random", count: 1, aspectRatio: "16:9" },
    problems: new Map(),
    setInput,
    setForm: () => undefined,
    fill: () => undefined,
    validate: () => Array.isArray(photo) && photo.length > 0,
    register: () => undefined,
  }
  const checks = usePhotoChecks(form, "image", check)
  const start: StartRun = {
    generate: spies.generate,
    isPending: false,
    error: null,
    price: "",
  }
  const checked = useCheckedStart(start, form, checks.isClear, spies.refused)
  return { inputs, checks, checked, setInput }
}

function renderScreen(check: CheckPhoto, first: string[], spies: Spies) {
  const client = new QueryClient()
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return renderHook(() => useScreen(check, first, spies), { wrapper })
}

const passed: PhotoCheck = { size: { width: 1200, height: 1600 } }
const tooSmall: PhotoCheck = { refusal: "too small" }

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe("the effects photo checks behind Generate", () => {
  it("waits for a pending check, then starts the run once the photo passes", async () => {
    const { check, pending } = checksAnsweredByHand()
    const spies = { generate: vi.fn(), refused: vi.fn() }
    const { result } = renderScreen(check, ["asset-photo"], spies)
    await waitFor(() => expect(pending).toHaveLength(1))
    act(() => result.current.checked.generate())
    expect(result.current.checked.isPending).toBe(true)
    expect(spies.generate).not.toHaveBeenCalled()
    act(() => pending[0]?.answer(passed))
    await waitFor(() => {
      expect(spies.generate).toHaveBeenCalledTimes(1)
      expect(result.current.checked.isPending).toBe(false)
    })
    expect(spies.generate).toHaveBeenCalledTimes(1)
    expect(result.current.checks.sizeOf("asset-photo")).toEqual(passed.size)
  })

  it("removes a refused photo with its reason and refuses the waiting run", async () => {
    const { check, pending } = checksAnsweredByHand()
    const spies = { generate: vi.fn(), refused: vi.fn() }
    const { result } = renderScreen(check, ["asset-small"], spies)
    await waitFor(() => expect(pending).toHaveLength(1))
    act(() => result.current.checked.generate())
    act(() => pending[0]?.answer(tooSmall))
    await waitFor(() => expect(spies.refused).toHaveBeenCalledTimes(1))
    expect(spies.generate).not.toHaveBeenCalled()
    expect(result.current.inputs.image).toEqual([])
    expect(result.current.checks.message).toBe("too small")
  })

  it("checks a photo placed while no field is on screen, and checks again after a load failure", async () => {
    const { check, pending } = checksAnsweredByHand()
    const spies = { generate: vi.fn(), refused: vi.fn() }
    const { result } = renderScreen(check, [], spies)
    act(() => result.current.setInput("image", ["asset-placed"]))
    await waitFor(() => expect(pending).toHaveLength(1))
    act(() => pending[0]?.answer({ refusal: "lost" }))
    await waitFor(() => expect(result.current.inputs.image).toEqual([]))
    expect(result.current.checks.message).toBe(
      tCatalog("effects.input.image.unread")
    )
    act(() => result.current.setInput("image", ["asset-placed"]))
    await waitFor(() => expect(pending).toHaveLength(2))
    act(() => pending[1]?.answer(passed))
    await waitFor(() => expect(result.current.checks.isClear).toBe(true))
    expect(result.current.checks.message).toBeNull()
  })

  it("checks again when another reader cancels the photo's shared fetch, and keeps the photo", async () => {
    let calls = 0
    const check: CheckPhoto = async () => {
      calls += 1
      if (calls === 1) {
        throw new CancelledError()
      }
      return passed
    }
    const spies = { generate: vi.fn(), refused: vi.fn() }
    const { result } = renderScreen(check, ["asset-uploaded"], spies)
    await waitFor(() => expect(result.current.checks.isClear).toBe(true))
    expect(calls).toBe(2)
    expect(result.current.inputs.image).toEqual(["asset-uploaded"])
    expect(result.current.checks.message).toBeNull()
  })

  it("refuses by the formats and the bytes the app's photo input declares", async () => {
    const accept = acceptOf(findCatalogApp("effects") as AppListing, "image")
    expect(accept).toEqual({
      formats: ["image/png", "image/jpeg", "image/webp"],
      maxBytes: 20_000_000,
      minShortSide: 480,
    })
    const client = new QueryClient()
    client.setQueryData(assetQuery("asset-gif").queryKey, {
      asset: { mime: "image/gif", bytes: 1000 },
    } as never)
    client.setQueryData(assetQuery("asset-big").queryKey, {
      asset: { mime: "image/png", bytes: 20_000_001 },
    } as never)
    const check = photoCheckOf(accept)
    expect(await check(client, "asset-gif")).toEqual({
      refusal: tCatalog("effects.input.image.wrongFormat"),
    })
    expect(await check(client, "asset-big")).toEqual({
      refusal: t("field.asset.tooLarge", {
        size: formatBytes(20_000_001),
        limit: formatBytes(20_000_000),
      }),
    })
  })

  it("refuses a photo under 480 px on its shorter side with its size, and keeps one of 480 px", async () => {
    const accept = acceptOf(findCatalogApp("effects") as AppListing, "image")
    const client = new QueryClient()
    for (const id of ["asset-wide", "asset-even"]) {
      client.setQueryData(assetQuery(id).queryKey, {
        asset: { mime: "image/jpeg", bytes: 1_000_000 },
      } as never)
    }
    const sizes = [
      { width: 1920, height: 479 },
      { width: 480, height: 2000 },
    ]
    vi.stubGlobal("createImageBitmap", async () => ({
      ...(sizes.shift() ?? { width: 0, height: 0 }),
      close: () => undefined,
    }))
    const check = photoCheckOf(accept)
    expect(await check(client, "asset-wide")).toEqual({
      refusal: tCatalog("effects.input.image.tooSmall", {
        side: 479,
        min: 480,
      }),
    })
    expect(await check(client, "asset-even")).toEqual({
      size: { width: 480, height: 2000 },
    })
  })
})
