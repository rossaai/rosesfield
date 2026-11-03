import type { CatalogModel } from "@rosesfield/catalog/comfy"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import { type ReactNode, useCallback, useState } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import {
  defaultsOf,
  type FieldValue,
  type FormValues,
} from "@/screens/app/app-form"
import type { HostedState } from "@/screens/app/hosted/use-hosted-model"
import type { AppForm } from "@/screens/app/use-app-form"
import type { MediaFacts } from "@/studio/motion/motion-checks"
import type { MotionTab } from "@/studio/motion/motion-tabs"
import type { MediaReading } from "@/studio/motion/use-media-facts"
import { useMotionScreen } from "@/studio/motion/use-motion-screen"
import {
  catalog,
  graph,
  graphId,
  motionListing,
  mover,
  swapGraphId,
  swapper,
} from "./motion-fixtures"

const listing = motionListing()

const world = vi.hoisted(() => {
  const first: Record<string, string | number | string[] | undefined> = {}
  return {
    first,
    files: new Map<string, MediaFacts>(),
    started: 0,
    references: ["ref-front", "ref-side"],
  }
})

vi.mock("@/catalog/catalog-copy", async (original) => {
  const actual = await original<typeof import("@/catalog/catalog-copy")>()
  return {
    ...actual,
    catalogCopy: {
      ...actual.catalogCopy,
      "motion.input.clip.range":
        "{model} takes videos of {min} to {max} seconds. This one runs {seconds} seconds.",
    },
  }
})

vi.mock("@/api/queries", async (original) => ({
  ...(await original<typeof import("@/api/queries")>()),
  characterQuery: (characterId: string) => ({
    queryKey: ["character", characterId],
    queryFn: () => ({
      character: {
        id: characterId,
        name: "Ana",
        references: world.references,
        notes: "",
        createdAt: "2026-10-20T00:00:00.000Z",
      },
    }),
  }),
}))

vi.mock("@/screens/app/use-app-form", () => ({
  useAppForm: (): AppForm => {
    const [values, setValues] = useState<FormValues>(() => {
      const base = defaultsOf(listing)
      return { ...base, inputs: { ...base.inputs, ...world.first } }
    })
    const setInput = useCallback((name: string, value: FieldValue) => {
      setValues((current) => ({
        ...current,
        inputs: { ...current.inputs, [name]: value },
      }))
    }, [])
    const setForm = useCallback(
      (change: Partial<FormValues>) =>
        setValues((current) => ({ ...current, ...change })),
      []
    )
    return {
      values,
      source: "defaults",
      problems: new Map(),
      setInput,
      setForm,
      fill: setValues,
      validate: () => true,
      register: () => undefined,
    }
  },
}))

vi.mock("@/screens/app/app-canvas", () => ({
  useAppRuns: () => ({
    runs: [],
    isPending: false,
    isError: false,
    refetch: () => undefined,
  }),
}))

vi.mock("@/screens/app/hosted/use-price-refresh", () => ({
  usePriceRefresh: () => undefined,
}))

vi.mock("@/screens/app/hosted/use-hosted-model", () => ({
  useHostedModel: (_app: unknown, form: AppForm): HostedState => {
    const id = form.values.inputs.model
    const models: readonly CatalogModel[] = catalog
    return {
      isTaskApp: true,
      models,
      isLoading: false,
      error: null,
      keyState: "set",
      defaultModel: graph.id,
      chosen: models.find((one) => one.id === id) ?? null,
      fields: null,
      choose: () => undefined,
    }
  },
}))

vi.mock("@/screens/app/use-start-run", () => ({
  useStartRun: () => ({
    generate: () => {
      world.started += 1
    },
    isPending: false,
    error: null,
    price: "",
    priceValue: "40",
    priceName: null,
    priceFrom: "task-runs",
  }),
}))

vi.mock("@/studio/motion/use-media-facts", () => ({
  useMediaFacts: (assetId: string | null): MediaReading => {
    const facts = assetId === null ? undefined : world.files.get(assetId)
    return facts === undefined
      ? { state: assetId === null ? "none" : "reading" }
      : { state: "read", facts }
  },
}))

const photo = "photo-1"
const clip = "clip-5s"
const longClip = "clip-12s"
const tooLongClip = "clip-38s"

function video(seconds: number): MediaFacts {
  return {
    mime: "video/mp4",
    bytes: 8_000_000,
    width: 720,
    height: 1280,
    seconds,
  }
}

function renderMotion(
  first: Record<string, FieldValue>,
  initialTab: MotionTab = "move"
) {
  world.first = first
  world.started = 0
  world.files.set(photo, {
    mime: "image/jpeg",
    bytes: 3_000_000,
    width: 1080,
    height: 1920,
    seconds: null,
  })
  world.files.set(clip, video(5))
  world.files.set(longClip, video(12))
  world.files.set(tooLongClip, video(38))
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return renderHook(
    () =>
      useMotionScreen(
        listing,
        { use: undefined, from: undefined },
        () => undefined,
        initialTab
      ),
    { wrapper }
  )
}

afterEach(cleanup)

describe("Motion opens", () => {
  it("on Move with the LTX 2.3 control graph, its Clip and Photo wells, and only Move's models in the picker", () => {
    const { result } = renderMotion({})
    expect(result.current.tab).toBe("move")
    expect(result.current.isGraph).toBe(true)
    expect(result.current.names).toEqual({ clip: "clip", photo: "photo" })
    expect(result.current.range).toEqual({ min: 2, max: 10, trims: true })
    expect(result.current.hosted.models.map((one) => one.id)).toEqual([
      graphId,
      mover.id,
    ])
  })

  it("on Swap from the old Recast address, with the swap graph and only Swap's models in the picker", () => {
    const { result } = renderMotion({}, "swap")
    expect(result.current.tab).toBe("swap")
    expect(result.current.form.values.inputs.model).toBe(swapGraphId)
    expect(result.current.isGraph).toBe(true)
    expect(result.current.range).toEqual({ min: 2, max: 5, trims: true })
    expect(result.current.hosted.models.map((one) => one.id)).toEqual([
      swapGraphId,
      swapper.id,
    ])
  })

  it("on the tab of a run you use again, whatever the address, the control", () => {
    const { result } = renderMotion({ model: swapGraphId, clip: [clip] })
    expect(result.current.tab).toBe("swap")
    expect(result.current.form.values.inputs.model).toBe(swapGraphId)
  })
})

describe("Motion's tabs", () => {
  it("move your clip and your photo to Swap's first model and back to Move's", () => {
    const { result } = renderMotion({ clip: [clip], photo: [photo] })
    act(() => result.current.setTab("swap"))
    expect(result.current.tab).toBe("swap")
    expect(result.current.form.values.inputs.model).toBe(swapGraphId)
    expect(result.current.form.values.inputs.clip).toEqual([clip])
    expect(result.current.form.values.inputs.photo).toEqual([photo])
    act(() => result.current.setTab("move"))
    expect(result.current.tab).toBe("move")
    expect(result.current.form.values.inputs.model).toBe(graphId)
    expect(result.current.form.values.inputs.clip).toEqual([clip])
  })

  it("keep your clip in the wells of a hosted model you pick on Swap", () => {
    const { result } = renderMotion({ clip: [clip], photo: [photo] })
    act(() => result.current.hosted.choose(mover.id))
    expect(result.current.tab).toBe("move")
    act(() => result.current.setTab("swap"))
    expect(result.current.hosted.chosen?.id).toBe(swapGraphId)
    act(() => result.current.hosted.choose(swapper.id))
    expect(result.current.tab).toBe("swap")
    expect(result.current.isGraph).toBe(false)
    expect(
      result.current.form.values.inputs[result.current.names.clip]
    ).toEqual([clip])
  })

  it("leave a Library example for your own video when you open Swap", () => {
    const { result } = renderMotion({ example: "grab-and-run" })
    expect(result.current.example?.id).toBe("grab-and-run")
    act(() => result.current.setTab("swap"))
    expect(result.current.example).toBeNull()
    expect(result.current.form.values.inputs.example).toBe("own")
  })
})

describe("Motion keeps your files", () => {
  it("in the wells of the model you pick, with the inputs and the length its schema declares", () => {
    const { result } = renderMotion({ clip: [clip], photo: [photo] })
    act(() => result.current.hosted.choose(mover.id))
    expect(result.current.isGraph).toBe(false)
    expect(result.current.names).toEqual({
      clip: "referenceVideo",
      photo: "characterImage",
    })
    expect(result.current.form.values.inputs.referenceVideo).toEqual([clip])
    expect(result.current.form.values.inputs.characterImage).toEqual([photo])
    expect(result.current.range).toEqual({ min: 3, max: 8, trims: false })
    expect(result.current.restFields.map((field) => field.name)).toEqual([
      "duration",
      "prompt",
    ])
  })

  it("takes a 38-second clip on the graph, says in one sentence that it keeps the first 10 seconds, and starts a run", () => {
    const { result } = renderMotion({ clip: [tooLongClip], photo: [photo] })
    expect(result.current.clipMessage).toBeNull()
    expect(result.current.clipNote).toBe(
      "Motion takes the first 10 seconds of your 38-second video."
    )
    act(() => result.current.start.generate())
    expect(world.started).toBe(1)
  })

  it("takes the first 5 seconds of a 12-second clip on Swap, the stretch the swap graph keeps", () => {
    const { result } = renderMotion(
      { clip: [longClip], photo: [photo] },
      "swap"
    )
    expect(result.current.clipMessage).toBeNull()
    expect(result.current.clipNote).toBe(
      "Motion takes the first 5 seconds of your 12-second video."
    )
  })

  it("says nothing about a clip the model takes whole", () => {
    const { result } = renderMotion({ clip: [clip], photo: [photo] })
    expect(result.current.clipNote).toBeNull()
    expect(result.current.clipMessage).toBeNull()
    act(() => result.current.start.generate())
    expect(world.started).toBe(1)
  })

  it("names the range of a model that cannot trim, starts no run and keeps your photo, the control", () => {
    const { result } = renderMotion({ clip: [longClip], photo: [photo] })
    act(() => result.current.hosted.choose(mover.id))
    expect(result.current.clipNote).toBeNull()
    expect(result.current.clipMessage).toBe(
      `${mover.id} takes videos of 3 to 8 seconds. This one runs 12 seconds.`
    )
    act(() => result.current.start.generate())
    expect(world.started).toBe(0)
    expect(result.current.form.values.inputs.characterImage).toEqual([photo])
  })
})

describe("Swap", () => {
  it("fills the Photo well with the first photo of the character you pick", async () => {
    const { result } = renderMotion({ clip: [clip] }, "swap")
    act(() => result.current.pickCharacter("character-ana"))
    await waitFor(() =>
      expect(result.current.form.values.inputs.photo).toEqual(["ref-front"])
    )
  })
})
