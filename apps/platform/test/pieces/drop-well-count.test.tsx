import { TooltipProvider } from "@rosesfield/ui/components/tooltip"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { t } from "@/copy/t"
import { DropWell } from "@/pieces/drop-well"

vi.mock("@/pieces/asset-tile", () => ({ AssetTile: () => null }))

const ids = Array.from(
  { length: 15 },
  (_, index) =>
    `0a1b2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c${String(index).padStart(2, "0")}`
)

function show(count: number): void {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <TooltipProvider>
        <DropWell
          kind="image"
          ids={ids.slice(0, count)}
          max={15}
          onChange={() => undefined}
          onMessage={() => undefined}
        />
      </TooltipProvider>
    </QueryClientProvider>
  )
}

afterEach(cleanup)

describe("the count of a well that takes several files", () => {
  it("shows no count while the well has room, as after its first photo", () => {
    show(1)
    expect(
      screen.queryByText(t("field.asset.count", { count: 1, max: 15 }))
    ).toBeNull()
  })

  it("shows no count one photo short of the limit", () => {
    show(14)
    expect(
      screen.queryByText(t("field.asset.count", { count: 14, max: 15 }))
    ).toBeNull()
  })

  it("shows the count once the well reaches its limit, the control", () => {
    show(15)
    expect(
      screen.getByText(t("field.asset.count", { count: 15, max: 15 }))
    ).toBeTruthy()
  })
})
