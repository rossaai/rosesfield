import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { t, tCatalog } from "@/copy/t"
import { RunShotRows } from "@/studio/remake/shot-details"
import { resetFrames } from "../../screens/app/frame-render"
import { remake, remakeRun, wirePlanOfThree } from "./remake-fixtures"
import { openRemake, stubGateway } from "./remake-screen"

beforeEach(stubGateway)

afterEach(() => {
  cleanup()
  resetFrames()
})

describe("Remake where the server cannot run it", () => {
  it("says so in the closed key's words and offers no Generate", async () => {
    openRemake({ listed: { ...remake, closedKey: "remake.closed" } })
    expect(await screen.findByText(tCatalog("remake.closed"))).toBeDefined()
    expect(screen.queryByRole("button", { name: t("run.generate") })).toBeNull()
    expect(
      screen.queryByText(tCatalog("remake.input.reference.label"))
    ).toBeNull()
  })

  it("control: the same listing open shows the inputs and Generate", async () => {
    openRemake({ listed: remake })
    expect(
      await screen.findByRole("button", { name: t("run.generate") })
    ).toBeDefined()
    expect(screen.queryByText(tCatalog("remake.closed"))).toBeNull()
  })
})

describe("a Remake run refused for its edit", () => {
  it("names the number of shots and the limit that applies", async () => {
    const refused = remakeRun({
      status: "failed",
      outputs: [],
      failure: { code: "REMAKE_SHOT_COUNT_9", status: 400 },
    })
    openRemake({ runs: [refused] })
    expect(
      await screen.findByText(
        tCatalog("remake.error.shotCount.title.other", { count: 9 })
      )
    ).toBeDefined()
    expect(
      screen.getByText(tCatalog("remake.error.shotCount.body"))
    ).toBeDefined()
  })

  it("control: a run that failed for another reason keeps the shared words", async () => {
    const failed = remakeRun({
      status: "failed",
      outputs: [],
      failure: { code: "RUN_FAILED", status: 502 },
    })
    openRemake({ runs: [failed] })
    await screen.findAllByText(tCatalog("remake.input.reference.label"))
    expect(
      screen.queryByText(tCatalog("remake.error.shotCount.body"))
    ).toBeNull()
  })
})

describe("the shots of a Remake run in the viewer's info panel", () => {
  it("lists each shot with its start and end, what happened to it and its model", () => {
    render(
      <dl>
        <RunShotRows run={remakeRun({ plan: wirePlanOfThree })} />
      </dl>
    )
    const rows = [...document.querySelectorAll("[data-slot='run-shot']")].map(
      (row) => row.textContent ?? ""
    )
    expect(rows).toHaveLength(3)
    expect(rows[0]).toContain(tCatalog("remake.route.replace"))
    expect(rows[0]).toContain("LTX 2.3 control")
    expect(rows[1]).toContain(tCatalog("remake.route.rebuild"))
    expect(rows[2]).toContain(tCatalog("remake.route.keep"))
    expect(
      screen.getByText(tCatalog("remake.plan.shot", { number: 2 }))
    ).toBeDefined()
  })

  it("control: a run with no plan lists no shot", () => {
    render(
      <dl>
        <RunShotRows run={remakeRun()} />
      </dl>
    )
    expect(document.querySelectorAll("[data-slot='run-shot']")).toHaveLength(0)
  })
})
