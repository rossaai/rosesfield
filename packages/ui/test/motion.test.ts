import { motion, readMotion, readTiming } from "@rosesfield/ui/motion"
import { afterEach, describe, expect, it } from "vitest"
import { readSource } from "./read-source"

const motionCss = readSource("styles/motion.css")

const contracts = import.meta.glob("../src/contracts/*.generated.ts", {
  eager: true,
})

function presetsOf(value: unknown): string[] {
  if (typeof value !== "object" || value === null || !("motion" in value)) {
    return []
  }
  const list = value.motion
  if (!Array.isArray(list)) {
    return []
  }
  return list.flatMap((row: unknown) =>
    typeof row === "object" &&
    row !== null &&
    "preset" in row &&
    typeof row.preset === "string"
      ? [row.preset]
      : []
  )
}

function contractPresets(): string[] {
  const names = Object.values(contracts).flatMap((module) =>
    typeof module === "object" && module !== null
      ? Object.values(module).flatMap(presetsOf)
      : []
  )
  return [...new Set(names)].sort()
}

function isPreset(name: string): name is keyof typeof motion {
  return Object.hasOwn(motion, name)
}

const contractOnly = ["disclosure", "swap", "travel", "yield"]

const scripted = ["popover", "layer", "enter"]
const phases = ["in", "out"]
const tracks = ["transform", "opacity"]

function blocks(): { base: string; reduced: string } {
  const split = motionCss.indexOf("@media (prefers-reduced-motion: reduce)")
  return { base: motionCss.slice(0, split), reduced: motionCss.slice(split) }
}

afterEach(() => {
  document.documentElement.removeAttribute("style")
})

describe("motion presets", () => {
  it("declares a timing for every scripted preset, phase and track, with and without reduced motion", () => {
    const { base, reduced } = blocks()
    for (const preset of scripted) {
      for (const phase of phases) {
        for (const track of tracks) {
          const name = `--${preset}-${phase}-${track}:`
          expect(base).toContain(name)
          expect(reduced).toContain(name)
        }
      }
    }
  })

  it("lands every transform at once under reduced motion", () => {
    const { reduced } = blocks()
    const transforms = [
      ...reduced.matchAll(/--[a-z]+-(?:in|out)-transform:\s*([^;]+);/g),
    ]
    expect(transforms.length).toBe(scripted.length * phases.length)
    for (const match of transforms) {
      expect(match[1]).toBe("0s linear")
    }
  })

  it("turns a control's rotate on the same timing as its transform", () => {
    const rule =
      /@utility motion-control \{([^}]*)\}/.exec(motionCss)?.[1] ?? ""
    expect(rule).toMatch(/\btransform var\(--control-change\)/)
    expect(rule).toMatch(/\brotate var\(--control-change\)/)
  })

  it("gives every preset a component contract names a utility a screen can apply", () => {
    const presets = contractPresets()
    expect(presets).toEqual(expect.arrayContaining(contractOnly))
    for (const preset of presets) {
      expect(isPreset(preset), preset).toBe(true)
      const utility = isPreset(preset) ? motion[preset].split(" ")[0] : ""
      expect(motionCss, preset).toContain(`@utility ${utility} {`)
    }
  })

  it("times disclosure, swap, travel and yield from a variable each, with a reduced timing that lands moves at once", () => {
    const { base, reduced } = blocks()
    for (const preset of contractOnly) {
      const rule =
        new RegExp(`@utility motion-${preset} \\{([^}]*)\\}`).exec(
          motionCss
        )?.[1] ?? ""
      expect(rule, preset).toContain(`var(--${preset})`)
      expect(base).toContain(`--${preset}:`)
      expect(reduced).toContain(`--${preset}:`)
    }
    for (const preset of ["disclosure", "travel", "yield"]) {
      expect(reduced).toContain(`--${preset}: 0s linear;`)
    }
    expect(base).toContain(
      "--travel: var(--duration-settle) var(--ease-settle);"
    )
    expect(base).toContain("--swap: var(--duration-press) var(--ease-glide);")
  })

  it("moves a travelling indicator by its offset and its measure", () => {
    const rule = /@utility motion-travel \{([^}]*)\}/.exec(motionCss)?.[1] ?? ""
    expect(rule).toMatch(/\btranslate var\(--travel\)/)
    expect(rule).toMatch(/\bwidth var\(--travel\)/)
  })

  it("reads a spring timing in milliseconds with its curve", () => {
    document.documentElement.style.setProperty(
      "--layer-in-transform",
      "491.67ms linear(0 0%, 0.5 40%, 1 100%)"
    )
    expect(readMotion("layer", "in", "transform")).toEqual({
      duration: 491.67,
      easing: "linear(0 0%, 0.5 40%, 1 100%)",
    })
  })

  it("reads seconds as milliseconds", () => {
    document.documentElement.style.setProperty("--tint-change", "0.12s ease")
    expect(readTiming("--tint-change")).toEqual({
      duration: 120,
      easing: "ease",
    })
  })

  it("lands at once when the variable is missing", () => {
    expect(readTiming("--missing-timing")).toEqual({
      duration: 0,
      easing: "linear",
    })
  })
})
