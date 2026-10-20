import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { t } from "@/copy/t"
import { MachineMade } from "@/screens/explore/explore-tile"

afterEach(cleanup)

describe("a shown output", () => {
  it("carries a visible machine-generated label over its tile", () => {
    const { container } = render(
      <MachineMade place="bottom">
        <figure data-slot="media" />
      </MachineMade>
    )
    const wrap = container.querySelector("[data-slot=machine-made]")

    expect(wrap?.querySelector("[data-slot=media]")).not.toBeNull()
    expect(wrap?.textContent).toBe(t("explore.tile.machineMade"))
    expect(wrap?.lastElementChild?.getAttribute("aria-hidden")).toBeNull()
  })
})
