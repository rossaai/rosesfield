import { TooltipProvider } from "@rosesfield/ui/components/tooltip"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { formatDuration } from "@/copy/format"
import { t } from "@/copy/t"
import { WaveformPlayer } from "@/studio/audio/waveform-player"

const assetId = "0a1b2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c01"

const download = vi.hoisted(() => vi.fn(async () => undefined))

vi.mock("@/api/queries", () => ({
  assetQuery: (id: string) => ({
    queryKey: ["asset", id],
    queryFn: () => ({
      asset: {
        id,
        kind: "audio",
        mime: "audio/mpeg",
        bytes: 40_000,
        width: null,
        height: null,
        durationSeconds: null,
        sourceRunId: null,
        createdAt: "2026-10-20T10:00:00.000Z",
      },
    }),
  }),
  runQuery: (id: string) => ({
    queryKey: ["run", id],
    queryFn: () => new Promise(() => undefined),
  }),
}))

vi.mock("@/api/use-asset-source", () => ({
  useAssetSource: () => ({ state: "ready", src: "blob:audio" }),
}))

vi.mock("@/pieces/asset-actions", () => ({
  useDownloadAsset: () => download,
}))

vi.mock("@/studio/audio/waveform", async (original) => ({
  ...(await original<typeof import("@/studio/audio/waveform")>()),
  readWaveform: async () => ({
    peaks: Array.from({ length: 64 }, (_, index) => (index % 4) / 4),
    seconds: 5,
  }),
}))

function show(): HTMLElement {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <WaveformPlayer assetId={assetId} />
      </TooltipProvider>
    </QueryClientProvider>
  ).container
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  download.mockClear()
})

describe("the Audio output player", () => {
  it("draws the output's waveform and shows its length", async () => {
    const container = show()
    await waitFor(() =>
      expect(
        container.querySelectorAll("[data-slot='waveform'] rect")
      ).toHaveLength(64)
    )
    expect(screen.getByText(formatDuration(5))).toBeTruthy()
  })

  it("plays in the page on Play and offers Pause while it plays", async () => {
    const play = vi
      .spyOn(window.HTMLMediaElement.prototype, "play")
      .mockResolvedValue(undefined)
    show()
    fireEvent.click(
      await screen.findByRole("button", { name: t("output.play") })
    )
    expect(play).toHaveBeenCalledOnce()
    expect(
      await screen.findByRole("button", { name: t("output.pause") })
    ).toBeTruthy()
  })

  it("downloads the output on Download", async () => {
    show()
    fireEvent.click(
      await screen.findByRole("button", { name: t("output.download") })
    )
    expect(download).toHaveBeenCalledWith(
      expect.objectContaining({ id: assetId })
    )
  })
})
