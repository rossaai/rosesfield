import { asset } from "@rosesfield/contract"
import { ToastProvider } from "@rosesfield/ui/components/toast"
import { TooltipProvider } from "@rosesfield/ui/components/tooltip"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import { type ReactElement, useState } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { assetQuery } from "@/api/queries"
import { formatBytes } from "@/copy/format"
import { t, tCatalog } from "@/copy/t"
import type { FieldValue } from "@/screens/app/app-form"
import { refusalOf, SourceField } from "@/studio/layers/source-field"
import { layersListing, photo } from "./layers-fixtures"

beforeEach(() => {
  vi.stubGlobal("fetch", () => new Promise(() => undefined))
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe("the image Layers splits", () => {
  it("refuses an image over 20 MB with its size and the limit", () => {
    expect(refusalOf(20_000_001, { width: 1024, height: 1024 })).toBe(
      t("field.asset.tooLarge", {
        size: formatBytes(20_000_001),
        limit: formatBytes(20_000_000),
      })
    )
    expect(refusalOf(20_000_001, null)).not.toBeNull()
  })

  it("refuses an image whose shorter side is under 256 px", () => {
    expect(refusalOf(1_000_000, { width: 1024, height: 255 })).toBe(
      tCatalog("layers.input.source.tooSmall", { size: 255, min: 256 })
    )
  })

  it("takes an image of 20 MB with a shorter side of 256 px", () => {
    expect(refusalOf(20_000_000, { width: 256, height: 1024 })).toBeNull()
  })
})

const source = layersListing.inputs.find((input) => input.name === "source")

function Form({ onInputs }: { onInputs: (inputs: object) => void }) {
  const [inputs, setInputs] = useState<Record<string, FieldValue>>({
    source: [photo],
    change: "a red hat",
    count: "6",
  })
  onInputs(inputs)
  if (source === undefined) {
    return null
  }
  return (
    <SourceField
      app={layersListing}
      input={source}
      value={inputs.source}
      problem={undefined}
      onChange={(value) =>
        setInputs((current) => ({ ...current, source: value }))
      }
      register={() => undefined}
      onSize={() => undefined}
    />
  )
}

function show(bytes: number, height: number, form: ReactElement): void {
  const client = new QueryClient()
  client.setQueryData(assetQuery(photo).queryKey, {
    asset: asset.parse({
      id: photo,
      kind: "image",
      mime: "image/png",
      bytes,
      width: 1024,
      height,
      durationSeconds: null,
      sourceRunId: null,
      createdAt: "2026-10-20T09:00:00.000Z",
    }),
  })
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <TooltipProvider>{form}</TooltipProvider>
      </ToastProvider>
    </QueryClientProvider>
  )
}

describe("an image Layers refuses", () => {
  it("shows the reason, takes the image out and keeps your other inputs", async () => {
    let seen: object = {}
    show(
      25_000_000,
      1024,
      <Form
        onInputs={(inputs) => {
          seen = inputs
        }}
      />
    )
    expect(
      await screen.findByText(
        t("field.asset.tooLarge", {
          size: formatBytes(25_000_000),
          limit: formatBytes(20_000_000),
        })
      )
    ).not.toBeNull()
    await waitFor(() =>
      expect(seen).toEqual({ source: [], change: "a red hat", count: "6" })
    )
  })
})
