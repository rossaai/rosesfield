import type { CatalogModel } from "@rosesfield/catalog/comfy"
import { act, cleanup, renderHook } from "@testing-library/react"
import { useCallback, useState } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import {
  defaultsOf,
  type FieldValue,
  type FormValues,
} from "@/screens/app/app-form"
import type { HostedState } from "@/screens/app/hosted/use-hosted-model"
import type { AppForm } from "@/screens/app/use-app-form"
import type { FileFacts, FileReading } from "@/studio/upscale/upscale-limits"
import { useUpscaleScreen } from "@/studio/upscale/use-upscale-screen"
import {
  bria,
  catalog,
  fluxVideo,
  graph,
  upscaleListing,
  waveSpeed,
} from "./upscale-fixtures"

const listing = upscaleListing()

const world = vi.hoisted(() => {
  const first: Record<string, FieldValue> = {}
  const sent: (string | null)[] = []
  return { first, files: new Map<string, FileFacts>(), started: 0, sent }
})

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
      ranBefore: [],
      choose: () => undefined,
    }
  },
}))

vi.mock("@/screens/app/use-start-run", () => ({
  useStartRun: (
    _app: unknown,
    _form: unknown,
    _done: unknown,
    hosted: HostedState | undefined
  ) => ({
    generate: () => {
      world.started += 1
      world.sent.push(hosted?.chosen?.id ?? null)
    },
    isPending: false,
    error: null,
    price: "",
    priceValue: "12",
    priceName: null,
  }),
}))

vi.mock("@/studio/upscale/use-file-facts", () => ({
  useFileFacts: (assetId: string | null): FileReading => {
    const facts = assetId === null ? undefined : world.files.get(assetId)
    return facts === undefined
      ? { state: assetId === null ? "none" : "reading" }
      : { state: "read", facts }
  },
}))

const photo = "photo-1024"
const clip = "clip-5s"

function renderUpscale(first: Record<string, FieldValue>) {
  world.first = first
  world.started = 0
  world.sent = []
  world.files.set(photo, {
    mime: "image/png",
    bytes: 2_000_000,
    width: 1024,
    height: 1024,
    seconds: null,
  })
  world.files.set(clip, {
    mime: "video/mp4",
    bytes: 8_000_000,
    width: 640,
    height: 360,
    seconds: 5,
  })
  return renderHook(() =>
    useUpscaleScreen(listing, { use: undefined, from: undefined }, () => {})
  )
}

afterEach(cleanup)

describe("Upscale opens", () => {
  it("on Image with the graph, its 2x and 4x and the 3840 pixel cap", () => {
    const { result } = renderUpscale({})
    expect(result.current.mode).toBe("image")
    expect(result.current.hosted.chosen?.id).toBe(graph.id)
    expect(result.current.scale.spec?.options.map((one) => one.value)).toEqual(
      ["2x", "4x"]
    )
    expect(result.current.well).toMatchObject({
      name: "image",
      limits: { minSide: 64 },
    })
  })

  it("on Video with the graph, listing only the models that take a video", () => {
    const { result } = renderUpscale({})
    act(() => result.current.setMode("video"))
    expect(result.current.mode).toBe("video")
    expect(result.current.hosted.chosen?.id).toBe(graph.id)
    expect(result.current.hosted.models.map((one) => one.id)).toEqual([
      graph.id,
      fluxVideo.id,
      "wavespeed/flashvsr",
    ])
  })

  it("on Video when the library hands it a video", () => {
    const { result } = renderUpscale({ video: [clip] })
    expect(result.current.mode).toBe("video")
    expect(result.current.well.name).toBe("video")
    expect(result.current.form.values.inputs.video).toEqual([clip])
  })
})

describe("a 1024 by 1024 image", () => {
  it("makes 2048 by 2048 pixels at 2x and starts a run", () => {
    const { result } = renderUpscale({ image: [photo] })
    expect(result.current.scale.check).toEqual({
      state: "fits",
      width: 2048,
      height: 2048,
    })
    expect(result.current.form.values.aspectRatio).toBe("1:1")
    act(() => result.current.start.generate())
    expect(world.started).toBe(1)
  })

  it("starts no run at 4x, focuses Scale and keeps the file", () => {
    const { result } = renderUpscale({ image: [photo], scale: "4x" })
    const focus = vi.fn()
    act(() => result.current.registerScale(focus))
    act(() => result.current.start.generate())
    expect(result.current.scale.check.state).toBe("tooBig")
    expect(world.started).toBe(0)
    expect(focus).toHaveBeenCalledTimes(1)
    expect(result.current.form.values.inputs.image).toEqual([photo])
  })
})

describe("another model", () => {
  it("takes WaveSpeed's scales and limits and keeps your file", () => {
    const { result } = renderUpscale({ image: [photo] })
    act(() => result.current.hosted.choose(waveSpeed.id))
    expect(result.current.hosted.chosen?.id).toBe(waveSpeed.id)
    expect(result.current.well).toMatchObject({
      name: "inputImage",
      limits: { minSide: null },
    })
    expect(result.current.form.values.inputs.inputImage).toEqual([photo])
    expect(result.current.scale.spec?.options.map((one) => one.value)).toEqual(
      ["2k", "4k", "8k"]
    )
    expect(result.current.scale.check.state).toBe("empty")
    expect(result.current.restFields.map((one) => one.name)).toEqual([
      "outputFormat",
    ])
    act(() => result.current.start.generate())
    expect(world.sent).toEqual([waveSpeed.id])
  })

  it("goes back to the graph on Video when the image model serves no video", () => {
    const { result } = renderUpscale({ image: [photo] })
    act(() => result.current.hosted.choose(waveSpeed.id))
    act(() => result.current.setMode("video"))
    expect(result.current.mode).toBe("video")
    expect(result.current.hosted.chosen?.id).toBe(graph.id)
    expect(result.current.form.values.inputs.image).toEqual([photo])
  })

  it("reads the size a range model makes from its factor", () => {
    const { result } = renderUpscale({ video: [clip] })
    act(() => result.current.hosted.choose(fluxVideo.id))
    expect(result.current.well.name).toBe("inputVideo")
    expect(result.current.form.values.inputs.inputVideo).toEqual([clip])
    expect(result.current.scale.check).toEqual({
      state: "fits",
      width: 1280,
      height: 720,
    })
  })

  it("writes the scale it shows when the model sets no default, so the run sends it", () => {
    const { result } = renderUpscale({ image: [photo] })
    act(() => result.current.hosted.choose(bria.id))
    expect(result.current.scale.value).toBe(2)
    expect(result.current.form.values.inputs.desiredIncrease).toBe(2)
  })
})
