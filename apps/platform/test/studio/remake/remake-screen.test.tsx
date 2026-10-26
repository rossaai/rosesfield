import {
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { t, tCatalog } from "@/copy/t"
import { asPhone, resetFrames } from "../../screens/app/frame-render"
import { remakeRun, runId, wirePlanOfThree } from "./remake-fixtures"
import {
  openRemake,
  runReads,
  served,
  startedRuns,
  stubGateway,
} from "./remake-screen"

const workingId = "5a6b7c8d-9e0f-4a1b-8c2d-3e4f5a6b7c8d"

beforeEach(stubGateway)

afterEach(() => {
  cleanup()
  resetFrames()
})

function workingRun(change: Record<string, unknown> = {}) {
  return remakeRun({
    id: workingId,
    status: "running",
    outputs: [],
    finishedAt: null,
    ...change,
  })
}

function isBefore(first: Element, second: Element): boolean {
  return Boolean(
    first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING
  )
}

describe("Remake on arrival", () => {
  it("shows the two wells with their limits, then the other inputs, in order, with no sound switch since the reference's sound is kept", async () => {
    openRemake()
    await screen.findAllByText(tCatalog("remake.input.reference.label"))
    const keys = [
      "remake.input.reference.label",
      "remake.input.reference.limits",
      "remake.input.character.label",
      "remake.input.character.limits",
      "remake.input.instructions.label",
      "remake.input.otherShots.label",
      "remake.input.quality.label",
    ]
    const shown = keys.map((key) => screen.getAllByText(tCatalog(key))[0])
    for (const [index, element] of shown.entries()) {
      const next = shown[index + 1]
      if (element === undefined) {
        throw new Error(`${keys[index]} is not shown`)
      }
      if (next !== undefined) {
        expect(isBefore(element, next)).toBe(true)
      }
    }
    expect(
      screen.queryByText(tCatalog("remake.input.keepSound.label"))
    ).toBeNull()
    expect(screen.queryByRole("switch")).toBeNull()
    const generate = screen
      .getAllByRole("button", { name: t("run.generate") })
      .filter((button) => button.dataset.slot === "generate-button")
    expect(generate).toHaveLength(1)
  })

  it("opens the Inputs sheet on a phone before any press", async () => {
    asPhone()
    openRemake()
    const sheet = await screen.findByRole("dialog")
    expect(
      within(sheet).getAllByText(tCatalog("remake.input.reference.label"))
        .length
    ).toBeGreaterThan(0)
    expect(
      within(sheet).getByRole("button", { name: t("run.generate") })
    ).toBeDefined()
  })

  it("shows Generate alone, with no price caption, because no plan has priced the shots", async () => {
    openRemake({ credits: 5 })
    await waitFor(() =>
      expect(
        document
          .querySelector("[data-slot=generate-button]")
          ?.getAttribute("data-priced")
      ).toBe("no")
    )
    expect(document.querySelector("[data-slot='remake-price']")).toBeNull()
    expect(screen.queryByText("Price unknown")).toBeNull()
    expect(
      screen.queryByRole("button", {
        name: t("run.generate.priced", { amount: "5" }),
      })
    ).toBeNull()
  })
})

describe("a run before its plan shows", () => {
  it("shows a working tile in the reference's ratio and no plan", async () => {
    const working = workingRun()
    openRemake({ runs: [working] })
    const tile = await screen.findByRole("status", {
      name: t("run.working", { index: 1, count: 1 }),
    })
    const row = tile.closest<HTMLElement>("[data-slot=output-row]")
    expect(row?.style.maxWidth).toMatch(/\* 0\.5625\)$/)
    expect(document.querySelector("[data-slot='remake-plan']")).toBeNull()
  })
})

describe("a run once its plan shows", () => {
  it("marks every cut on the reference's timeline and lists each shot with its length, its route and its model", async () => {
    const working = workingRun({ plan: wirePlanOfThree })
    openRemake({ runs: [working] })
    const plan = await waitFor(() => {
      const found = document.querySelector<HTMLElement>(
        "[data-slot='remake-plan']"
      )
      if (found === null) {
        throw new Error("no plan")
      }
      return found
    })
    expect(plan.querySelectorAll("[data-slot='shot']")).toHaveLength(3)
    expect(plan.querySelectorAll("[data-slot='cut']")).toHaveLength(2)
    const rows = [...plan.querySelectorAll("[data-slot='plan-shot']")].map(
      (row) => row.textContent
    )
    expect(rows).toEqual([
      `${tCatalog("remake.plan.shot", { number: 1 })}4 seconds${tCatalog("remake.route.replace")}LTX 2.3 control`,
      `${tCatalog("remake.plan.shot", { number: 2 })}3.5 seconds${tCatalog("remake.route.rebuild")}LTX 2.5`,
      `${tCatalog("remake.plan.shot", { number: 3 })}2.5 seconds${tCatalog("remake.route.keep")}`,
    ])
    expect(
      within(plan).getByText(t("run.price.credits", { amount: "13" }))
    ).toBeDefined()
    expect(
      screen.getByRole("status", {
        name: t("run.working", { index: 1, count: 1 }),
      })
    ).toBeDefined()
  })

  it("gives way to one caption, Stopped, once the run is stopped", async () => {
    const stopped = workingRun({ status: "cancelled", plan: wirePlanOfThree })
    openRemake({ runs: [stopped] })
    expect(await screen.findByText(t("state.stopped"))).toBeDefined()
    expect(document.querySelector("[data-slot='remake-plan']")).toBeNull()
    expect(document.querySelector("[data-slot='working-pulse']")).toBeNull()
  })
})

describe("the plans of the runs in the history", () => {
  it("reads each plan from the run the runs page carries, with no read of its own per run", async () => {
    const working = workingRun({ plan: wirePlanOfThree })
    const earlier = remakeRun({ plan: wirePlanOfThree })
    openRemake({ runs: [working, earlier] })
    await waitFor(() => {
      if (document.querySelector("[data-slot='remake-plan']") === null) {
        throw new Error("no plan")
      }
    })
    expect(runReads()).toEqual([])
  })
})

describe("Generate on a phone", () => {
  it("closes the Inputs sheet on the working tile once the run starts", async () => {
    asPhone()
    served.runs.set(runId, { run: remakeRun() })
    served.started = workingRun()
    openRemake({ seeds: { use: undefined, from: runId } })
    const sheet = await screen.findByRole("dialog")
    const generate = within(sheet).getByRole("button", {
      name: t("run.generate"),
    })
    await waitFor(() => {
      fireEvent.click(generate)
      expect(startedRuns()).toHaveLength(1)
    })
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    expect(
      await screen.findByRole("status", {
        name: t("run.working", { index: 1, count: 1 }),
      })
    ).toBeDefined()
  })
})
