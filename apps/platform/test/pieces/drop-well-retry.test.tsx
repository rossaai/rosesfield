import { type Asset, asset as assetSchema } from "@rosesfield/contract"
import { TooltipProvider } from "@rosesfield/ui/components/tooltip"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { type ReactElement, useState } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { uploadAsset } from "@/api/upload-asset"
import { t } from "@/copy/t"
import { DropWell } from "@/pieces/drop-well"

vi.mock("@/api/upload-asset", () => ({ uploadAsset: vi.fn() }))
vi.mock("@/pieces/asset-tile", () => ({ AssetTile: () => null }))

const assetId = "0a1b2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c01"

const asset: Asset = assetSchema.parse({
  id: assetId,
  kind: "audio",
  mime: "audio/wav",
  bytes: 40_000,
  width: null,
  height: null,
  durationSeconds: 7.5,
  sourceRunId: null,
  createdAt: "2026-10-20T10:00:00.000Z",
})

function show(onChange: (ids: string[]) => void): HTMLElement {
  const container = render(
    <QueryClientProvider client={new QueryClient()}>
      <TooltipProvider>
        <DropWell
          kind="audio"
          ids={[]}
          max={1}
          onChange={onChange}
          onMessage={() => undefined}
        />
      </TooltipProvider>
    </QueryClientProvider>
  ).container
  const well = container.querySelector("[data-slot='drop-well']")
  if (well === null) {
    throw new Error("the field shows no well")
  }
  return well as HTMLElement
}

const laterId = "0a1b2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c02"

function Owner(props: { onChange: (ids: string[]) => void }): ReactElement {
  const [ids, setIds] = useState<string[]>([])
  return (
    <DropWell
      kind="audio"
      ids={ids}
      max={2}
      onChange={(next) => {
        props.onChange(next)
        setIds(next)
      }}
      onMessage={() => undefined}
    />
  )
}

function showOwned(onChange: (ids: string[]) => void): HTMLElement {
  const container = render(
    <QueryClientProvider client={new QueryClient()}>
      <TooltipProvider>
        <Owner onChange={onChange} />
      </TooltipProvider>
    </QueryClientProvider>
  ).container
  const well = container.querySelector("[data-slot='drop-well']")
  if (well === null) {
    throw new Error("the field shows no well")
  }
  return well as HTMLElement
}

function dropRecording(well: HTMLElement, name = "voice.wav"): void {
  const voice = new File(["sound"], name, { type: "audio/wav" })
  fireEvent.drop(well, { dataTransfer: { files: [voice] } })
}

beforeEach(() => {
  vi.stubGlobal("fetch", () => new Promise(() => undefined))
  vi.mocked(uploadAsset).mockReset()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe("a well whose upload is retried", () => {
  it("sweep bug: Retry of a failed upload reports the new asset id to onChange", async () => {
    vi.mocked(uploadAsset)
      .mockRejectedValueOnce(new Error("the network dropped"))
      .mockResolvedValueOnce(asset)
    const onChange = vi.fn()
    const well = show(onChange)
    dropRecording(well)
    fireEvent.click(
      await screen.findByRole("button", { name: t("state.tryAgain") })
    )
    await waitFor(() => expect(onChange).toHaveBeenCalledWith([assetId]))
  })

  it("sweep control: a first upload that succeeds reports its asset id to onChange", async () => {
    vi.mocked(uploadAsset).mockResolvedValueOnce(asset)
    const onChange = vi.fn()
    const well = show(onChange)
    dropRecording(well)
    await waitFor(() => expect(onChange).toHaveBeenCalledWith([assetId]))
  })

  it("keeps a file added while the retry runs", async () => {
    let finishRetry: (value: Asset) => void = () => undefined
    vi.mocked(uploadAsset)
      .mockRejectedValueOnce(new Error("the network dropped"))
      .mockReturnValueOnce(
        new Promise<Asset>((resolve) => {
          finishRetry = resolve
        })
      )
      .mockResolvedValueOnce(assetSchema.parse({ ...asset, id: laterId }))
    const onChange = vi.fn()
    const well = showOwned(onChange)
    dropRecording(well)
    fireEvent.click(
      await screen.findByRole("button", { name: t("state.tryAgain") })
    )
    dropRecording(well, "second.wav")
    await waitFor(() => expect(onChange).toHaveBeenCalledWith([laterId]))
    finishRetry(asset)
    await waitFor(() =>
      expect(onChange).toHaveBeenLastCalledWith([laterId, assetId])
    )
  })
})
