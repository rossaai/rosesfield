import type { AppListing } from "@rosesfield/contract"
import { TooltipProvider } from "@rosesfield/ui/components/tooltip"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { AssetInput } from "@/catalog/app-facts"
import { formatDuration } from "@/copy/format"
import { t } from "@/copy/t"
import type { FieldValue } from "@/screens/app/app-form"
import { RecordingField } from "@/studio/audio/recording-field"
import { audioListing } from "./audio-app"

const assetId = "0a1b2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c01"

vi.mock("@/api/queries", () => ({
  assetQuery: (id: string) => ({
    queryKey: ["asset", id],
    queryFn: () => ({
      asset: {
        id,
        kind: "audio",
        mime: "audio/wav",
        bytes: 40_000,
        width: null,
        height: null,
        durationSeconds: 7.5,
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
  useAssetSource: () => ({ state: "ready", src: "blob:recording" }),
}))

const audio: AppListing = audioListing()

function recordingInput(): AssetInput {
  const input = audio.inputs.find((one) => one.name === "recording")
  if (input?.type !== "audio") {
    throw new Error("the fixture has no recording")
  }
  return input
}

function show(
  value: FieldValue,
  onChange: (value: FieldValue) => void
): HTMLElement {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <TooltipProvider>
        <RecordingField
          app={audio}
          input={recordingInput()}
          value={value}
          problem={undefined}
          onChange={onChange}
          register={() => undefined}
        />
      </TooltipProvider>
    </QueryClientProvider>
  ).container
}

beforeEach(() => {
  vi.stubGlobal("fetch", () => new Promise(() => undefined))
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe("a recording added in Voice clone or Voice change", () => {
  it("shows its name, its length and a play button", async () => {
    show([assetId], () => undefined)
    expect(await screen.findByText(t("output.upload.audio"))).toBeTruthy()
    expect(screen.getByText(formatDuration(7.5))).toBeTruthy()
    expect(screen.getByRole("button", { name: t("output.play") })).toBeTruthy()
  })

  it("takes the recording out on Remove", async () => {
    const onChange = vi.fn()
    show([assetId], onChange)
    fireEvent.click(
      await screen.findByRole("button", { name: t("field.asset.remove") })
    )
    expect(onChange).toHaveBeenCalledWith([])
  })

  it("offers to add a recording while none is added", () => {
    show([], () => undefined)
    expect(screen.queryByRole("button", { name: t("output.play") })).toBeNull()
    expect(
      screen.getByRole("button", {
        name: new RegExp(t("field.asset.add.audio")),
      })
    ).toBeTruthy()
  })

  it("refuses a file that is not audio and says why", async () => {
    const container = show([], () => undefined)
    const well = container.querySelector("[data-slot='drop-well']")
    if (well === null) {
      throw new Error("the field shows no well")
    }
    const notes = new File(["words"], "notes.txt", { type: "text/plain" })
    fireEvent.drop(well, { dataTransfer: { files: [notes] } })
    expect(
      await screen.findByText(
        t("field.asset.wrongKind", { kinds: t("apps.input.audio") })
      )
    ).toBeTruthy()
  })
})
