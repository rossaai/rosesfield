import { describe, expect, it } from "vitest"
import {
  type LibraryExample,
  maxHits,
} from "#motion/examples/library-example.contract"
import {
  exampleOf,
  libraryExamples,
  readExamples,
  readLedger,
} from "#motion/examples/library-examples"
import { graphLooks, keptRun, passedRecipe } from "./passed-recipe"

const ledger = [keptRun("many-copies")]

const looks = [
  "buildings-ripple",
  "freeze-and-circle",
  "grow-giant",
  "many-copies",
  "melt-away",
  "pull-back-to-space",
  "push-into-eye",
  "scatter-petals",
  "still-in-the-street",
]

const passedLooks = ["push-into-eye"]

const endFrameSources: Readonly<Record<string, string>> = {
  "push-into-eye": "dark",
  "still-in-the-street": "none",
}

function variant(change: Record<string, unknown>): Record<string, unknown> {
  return { ...exampleOf("many-copies"), ...change }
}

function passedVariant(
  change: (recipe: LibraryExample) => unknown
): Record<string, unknown> {
  return { "many-copies": change(passedRecipe("many-copies")) }
}

function cutsOf(recipe: LibraryExample): number {
  return recipe.design.cuts.filter((window) => window.kind === "cut").length
}

describe("the effect recipes kept as data", () => {
  it("reads the nine looks, with Push into eye and Still in the street the ones passed and none with an adapter", () => {
    const read = graphLooks.map(({ id, passed, adapter }) => [
      id,
      passed,
      adapter,
    ])
    const named = looks.map((id) => [id, passedLooks.includes(id), null])
    expect(read).toEqual(named)
    const passed = libraryExamples.filter((one) => one.passed)
    expect(passed.map((one) => one.id)).toEqual(passedLooks)
  })

  it("names for each look the unit page and the family page it is designed from by id and title, with its whole chain", () => {
    for (const recipe of graphLooks) {
      const { design } = recipe
      expect({ effect: recipe.id, unit: design.unit }).toEqual({
        effect: recipe.id,
        unit: { id: recipe.id, title: `Unit: ${recipe.id}` },
      })
      expect(design.family).toEqual({ id: "effects", title: "Family: effects" })
      expect(design.fit).toEqual({ by: "area", edges: "crop" })
      expect(design.setPiece.length).toBeGreaterThan(0)
      expect(design.lastFrame.shows.length).toBeGreaterThan(0)
      expect(design.encode).toEqual({
        container: "mp4",
        codec: "h264",
        bitDepth: 8,
        grain: 0.004,
      })
      expect(recipe.seconds).toBeGreaterThanOrEqual(5)
      expect(recipe.seconds).toBeLessThanOrEqual(15)
      for (const window of design.cuts) {
        expect(window.max).toBeLessThanOrEqual(recipe.seconds + 0.05)
      }
      expect(recipe.endFrame.source, recipe.id).toBe(
        endFrameSources[recipe.id] ?? "edit"
      )
    }
  })

  it("keeps the fixed lengths, the cut plans and the sound beds of the reference looks", () => {
    const plans = Object.fromEntries(
      graphLooks.map((recipe) => [
        recipe.id,
        {
          seconds: recipe.seconds,
          cuts: cutsOf(recipe),
          sound: recipe.design.sound !== null,
        },
      ])
    )
    expect(plans).toEqual({
      "buildings-ripple": { seconds: 7, cuts: 0, sound: false },
      "freeze-and-circle": { seconds: 15, cuts: 1, sound: true },
      "grow-giant": { seconds: 10, cuts: 2, sound: true },
      "many-copies": { seconds: 7, cuts: 0, sound: false },
      "melt-away": { seconds: 7, cuts: 0, sound: true },
      "pull-back-to-space": { seconds: 10, cuts: 0, sound: true },
      "push-into-eye": { seconds: 7, cuts: 0, sound: true },
      "scatter-petals": { seconds: 5, cuts: 0, sound: true },
      "still-in-the-street": { seconds: 6, cuts: 0, sound: true },
    })
  })

  it("opens Earth Zoom in orbit and lands on the photo, as its unit page reads, and opens every other look on the photo", () => {
    expect(
      Object.fromEntries(
        graphLooks.map((recipe) => [recipe.id, recipe.photoFrame])
      )
    ).toEqual(
      Object.fromEntries(
        looks.map((effect) => [
          effect,
          effect === "pull-back-to-space" ? "last" : "first",
        ])
      )
    )
    const earthZoom = exampleOf("pull-back-to-space")
    expect(earthZoom.prompt).toMatch(/The camera starts in orbit/)
    expect(earthZoom.prompt).toMatch(/lands at ground level on them/)
    expect(earthZoom.design.lastFrame.shows).toMatch(
      /^The person at street level/
    )
  })

  it("refuses a look that lands on the photo with no edited frame to open on, or with a held subject", () => {
    const landing = exampleOf("pull-back-to-space")
    expect(() =>
      readExamples(
        {
          "pull-back-to-space": {
            ...landing,
            endFrame: { source: "none" },
          },
        },
        ledger
      )
    ).toThrow(/pull-back-to-space\.json is invalid: endFrame/)
    expect(() =>
      readExamples({ "pull-back-to-space": { ...landing, hold: 0.5 } }, ledger)
    ).toThrow(/pull-back-to-space\.json is invalid: hold/)
    expect(() =>
      readExamples({ "many-copies": variant({ photoFrame: "middle" }) }, ledger)
    ).toThrow(/many-copies\.json is invalid: photoFrame/)
  })

  it("ends Push into eye on a dark frame under its last-frame luma, after a light guide toward a photographic copper iris, with a calm face, a pupil that grows with a sharp edge, one impact hit and a fade to silence", () => {
    const eye = exampleOf("push-into-eye")
    expect(eye.endFrame).toEqual({ source: "dark", luma: 1, strength: 0.9 })
    expect(eye.midFrame).toMatchObject({
      source: "edit",
      time: 5.4,
      strength: 0.3,
    })
    expect(eye.midFrame?.prompt).toMatch(
      /real macro photograph of the iris of one of the person's eyes/
    )
    expect(eye.midFrame?.prompt).toMatch(/iris fills the whole frame/)
    expect(eye.midFrame?.prompt).toMatch(
      /warm copper orange like a real human amber eye/
    )
    expect(eye.midFrame?.prompt).toMatch(
      /No glow, no outlines, no drawn lines, no veins/
    )
    expect(eye.midFrame?.prompt).toMatch(
      /pupil in the centre is small, round and pure black/
    )
    expect(eye.prompt).toMatch(
      /face, skin and calm expression stay exactly as in the photo/
    )
    expect(eye.prompt).toMatch(/warm copper orange like a real human amber eye/)
    expect(eye.prompt).not.toMatch(/glow/)
    expect(eye.prompt).toMatch(/never slows/)
    expect(eye.prompt).toMatch(
      /black pupil in its centre grows larger and larger with a sharp edge/
    )
    expect(eye.prompt).toMatch(/black pupil swallows the whole frame/)
    expect(eye.prompt).not.toMatch(/\b(fades?|dims?)\b/)
    expect(eye.design.sound?.prompt).toMatch(/^From the very first frame/)
    expect(eye.design.sound?.prompt).not.toMatch(/impact|hit/)
    expect(eye.design.sound?.fadeOut).toBe(0.4)
    const hits = eye.design.sound?.hits ?? []
    expect(hits.length).toBeGreaterThan(0)
    expect(hits.length).toBeLessThanOrEqual(maxHits)
    for (const hit of hits) {
      expect(hit.time).toBeLessThan(eye.seconds)
      expect(hit.prompt).toMatch(/no music, no voice\.$/i)
    }
    expect(
      eye.endFrame.source === "dark" ? eye.endFrame.luma : 255
    ).toBeLessThan(eye.design.lastFrame.maxLuma ?? 0)
    expect(eye.prompt).toMatch(
      /^One unbroken shot that moves from the first frame/
    )
    expect(eye.prompt).not.toMatch(/\bholds?\b|for a moment/)
    expect(eye.seconds).toBe(7)
  })

  it("refuses a dark end frame on a look that lands on the photo, and reads one on a look that opens on it", () => {
    const dark = { source: "dark", luma: 8, strength: 0.9 }
    expect(() =>
      readExamples(
        {
          "pull-back-to-space": {
            ...exampleOf("pull-back-to-space"),
            endFrame: dark,
          },
        },
        ledger
      )
    ).toThrow(
      /pull-back-to-space\.json is invalid: endFrame An example that lands on the photo guides its last frame with the photo, so it takes no dark end frame/
    )
    const [read] = readExamples(
      { "many-copies": variant({ endFrame: dark }) },
      ledger
    )
    expect(read?.endFrame).toEqual(dark)
    for (const luma of [-1, 41, 8.5]) {
      expect(() =>
        readExamples(
          { "many-copies": variant({ endFrame: { ...dark, luma } }) },
          ledger
        )
      ).toThrow(/many-copies\.json is invalid: endFrame/)
    }
  })

  it("reads a passed recipe that carries its run and the proof of that run", () => {
    const [read] = readExamples(
      { "many-copies": passedRecipe("many-copies") },
      ledger
    )
    expect(read).toMatchObject({
      passed: true,
      preview: { file: "many-copies.mp4" },
      proof: { judge: { verdict: "held" }, gate: { planted: "refused" } },
    })
  })

  it("refuses a passed recipe whose run reads outside its criteria", () => {
    const sources = passedVariant((recipe) => ({
      ...recipe,
      proof: recipe.proof && {
        ...recipe.proof,
        reading: { ...recipe.proof.reading, lastFrameLuma: 90, cuts: [3] },
      },
    }))
    expect(() => readExamples(sources, ledger)).toThrow(
      /many-copies\.json passed on a run outside its criteria: cut: one at 3 s, outside every window, last frame: luma 90, against at most 40/
    )
  })

  it("refuses a passed recipe whose run is not a row of the run ledger", () => {
    const sources = { "many-copies": passedRecipe("many-copies") }
    expect(() => readExamples(sources, [])).toThrow(
      /many-copies\.json passed on a run the ledger does not keep: the run 5b1d2c3e-4f5a-4b6c-8d7e-9f0a1b2c3d4e is not a row of the run ledger/
    )
  })

  it("refuses a passed recipe whose ledger row holds another input, or the judge's refusal", () => {
    const sources = { "many-copies": passedRecipe("many-copies") }
    expect(() =>
      readExamples(sources, [{ ...keptRun("many-copies"), seed: 8 }])
    ).toThrow(/with another recipe or input/)
    expect(() => readExamples(sources, [keptRun("melt-away")])).toThrow(
      /with another recipe or input/
    )
    expect(() =>
      readExamples(sources, [
        {
          ...keptRun("many-copies"),
          verdict: "refused",
          failed: ["Dark end"],
        },
      ])
    ).toThrow(/records the run 5b1d2c3e-4f5a-4b6c-8d7e-9f0a1b2c3d4e as refused/)
  })

  it("reads a ledger with a kept and a refused run, each with its recipe, input, balance and verdict", () => {
    const refused = {
      ...keptRun("many-copies"),
      runId: "6c2e3d4f-5a6b-4c7d-9e8f-0a1b2c3d4e5f",
      balance: { before: 3601.4, after: 3540.2 },
      verdict: "refused",
      failed: ["Dark end"],
    }
    expect(readLedger([keptRun("many-copies"), refused])).toHaveLength(2)
  })

  it("refuses a run that took the balance under 2,000 credits, or started under it", () => {
    expect(() =>
      readLedger([
        {
          ...keptRun("many-copies"),
          balance: { before: 2050, after: 1990 },
        },
      ])
    ).toThrow(/runs\.json is invalid: 0\.balance\.after/)
    expect(() =>
      readLedger([
        {
          ...keptRun("many-copies"),
          balance: { before: 1990, after: 1990 },
        },
      ])
    ).toThrow(/runs\.json is invalid: 0\.balance\.before/)
  })

  it("refuses a kept run that failed a criterion, a refused run that names none, and one run in two rows", () => {
    expect(() =>
      readLedger([{ ...keptRun("many-copies"), failed: ["Dark end"] }])
    ).toThrow(/runs\.json is invalid: 0\.failed/)
    expect(() =>
      readLedger([{ ...keptRun("many-copies"), verdict: "refused" }])
    ).toThrow(/runs\.json is invalid: 0\.failed/)
    expect(() =>
      readLedger([keptRun("many-copies"), keptRun("many-copies")])
    ).toThrow(/Each run is one row of the ledger/)
  })

  it("refuses a judge that failed a criterion, and a gate that let its planted output pass", () => {
    const failed = passedVariant((recipe) => ({
      ...recipe,
      proof: recipe.proof && {
        ...recipe.proof,
        judge: { criteria: 13, failed: ["Dark end"], verdict: "held" },
      },
    }))
    expect(() => readExamples(failed, ledger)).toThrow(
      /many-copies\.json is invalid: proof\.judge\.failed/
    )
    const planted = passedVariant((recipe) => ({
      ...recipe,
      proof: recipe.proof && {
        ...recipe.proof,
        gate: { positives: 1, planted: "held", verdict: "held" },
      },
    }))
    expect(() => readExamples(planted, ledger)).toThrow(
      /many-copies\.json is invalid: proof\.gate\.planted/
    )
  })

  it("refuses a passed recipe with no proof, and a proof on a recipe not passed", () => {
    const unproven = passedVariant((recipe) => ({ ...recipe, proof: null }))
    expect(() => readExamples(unproven, ledger)).toThrow(
      /many-copies\.json is invalid: proof/
    )
    const unpassed = passedVariant((recipe) => ({
      ...recipe,
      passed: false,
      preview: null,
    }))
    expect(() => readExamples(unpassed, ledger)).toThrow(
      /many-copies\.json is invalid: proof/
    )
  })

  it("refuses an empty effect prompt, a length past 15 seconds and a look with no unit", () => {
    expect(() =>
      readExamples({ "many-copies": variant({ prompt: "" }) }, ledger)
    ).toThrow(/many-copies\.json is invalid: prompt/)
    expect(() =>
      readExamples({ "many-copies": variant({ seconds: 16 }) }, ledger)
    ).toThrow(/many-copies\.json is invalid: seconds/)
    const { unit: _, ...design } = exampleOf("many-copies").design
    expect(() =>
      readExamples({ "many-copies": variant({ design }) }, ledger)
    ).toThrow(/many-copies\.json is invalid: design\.unit/)
  })

  it("refuses a passed recipe with no run, and a run on a recipe not passed", () => {
    expect(() =>
      readExamples({ "many-copies": variant({ passed: true }) }, ledger)
    ).toThrow(/many-copies\.json is invalid: preview/)
    const preview = passedRecipe("many-copies").preview
    expect(() =>
      readExamples({ "many-copies": variant({ preview }) }, ledger)
    ).toThrow(/many-copies\.json is invalid: preview/)
  })

  it("refuses a file that names another effect", () => {
    expect(() => readExamples({ "melt-away": variant({}) }, ledger)).toThrow(
      /melt-away\.json names the example many-copies/
    )
  })
})
