import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import { type ReactNode, useCallback, useState } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { tCatalog } from "@/copy/t"
import type { FieldValue } from "@/screens/app/app-form"
import type { AppForm } from "@/screens/app/use-app-form"
import type { StartRun } from "@/screens/app/use-start-run"
import { useCheckedStart } from "@/studio/effects/use-checked-start"
import {
  type CheckPhoto,
  type PhotoCheck,
  usePhotoChecks,
} from "@/studio/effects/use-photo-checks"

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
    await waitFor(() => expect(spies.generate).toHaveBeenCalledTimes(1))
    expect(result.current.checks.sizeOf("asset-photo")).toEqual(passed.size)
    expect(result.current.checked.isPending).toBe(false)
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
})
