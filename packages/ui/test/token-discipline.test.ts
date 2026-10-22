import { describe, expect, it } from "vitest"
import { readSource } from "./read-source"

const sources = import.meta.glob(
  [
    "../src/components/**/*.{ts,tsx}",
    "../../../apps/platform/src/**/*.{ts,tsx}",
    "!**/*.generated.ts",
    "!**/*.gen.ts",
    "!**/*.d.ts",
    "!**/*.test.{ts,tsx}",
  ],
  { query: "?raw", import: "default", eager: true }
)

const edge = "(?<![A-Za-z0-9.])"
const end = "(?![A-Za-z0-9])"
const amount = "(?:[1-9]\\d*|\\d*\\.\\d+)"

type Refusal = { file: string; line: number; rule: string; text: string }

const lineRules: ReadonlyArray<{ rule: string; pattern: RegExp }> = [
  {
    rule: "a colour written as hex",
    pattern:
      /(?<![A-Za-z0-9&/])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![A-Za-z0-9])/,
  },
  {
    rule: "a colour written as a function",
    pattern: /\b(?:rgba?|hsla?|oklch|oklab|hwb|lab|lch)\(/,
  },
  {
    rule: "a size, radius, shadow or duration written in px, rem, em or ms",
    pattern: new RegExp(`${edge}${amount}(?:px|rem|em|ms)${end}`),
  },
  {
    rule: "a duration written in seconds inside an arbitrary value",
    pattern: new RegExp(`\\[[^\\]\\s]*${edge}${amount}s${end}[^\\]\\s]*\\]`),
  },
]

const canvasData = /\.(?:fillStyle|strokeStyle)\s*=\s*(["'`])[^"'`]*\1/g

const styleKeys =
  /\b(?:width|height|minWidth|maxWidth|minHeight|maxHeight|padding\w*|margin\w*|gap|rowGap|columnGap|top|left|right|bottom|inset|borderRadius|borderWidth|fontSize|lineHeight|letterSpacing|outlineWidth|outlineOffset|transitionDuration|animationDuration)\s*:\s*-?(?:[1-9]\d*|\d*\.\d+)\b/

function styleRefusals(file: string, text: string): Refusal[] {
  const refusals: Refusal[] = []
  for (const match of text.matchAll(/style=\{\{([\s\S]*?)\}\}/g)) {
    const body = match[1] ?? ""
    const found = styleKeys.exec(body)
    if (found !== null) {
      const line = text.slice(0, match.index).split("\n").length
      refusals.push({
        file,
        line,
        rule: "a size or duration written as a number in an inline style",
        text: found[0],
      })
    }
  }
  return refusals
}

function refusalsIn(file: string, text: string): Refusal[] {
  const refusals: Refusal[] = []
  for (const [index, written] of text.split("\n").entries()) {
    const line = written.replace(canvasData, "")
    for (const { rule, pattern } of lineRules) {
      const found = pattern.exec(line)
      if (found !== null) {
        refusals.push({ file, line: index + 1, rule, text: found[0] })
      }
    }
  }
  return [...refusals, ...styleRefusals(file, text)]
}

const planted: ReadonlyArray<[string, string]> = [
  ["a hex fill", `<span className="bg-[#d1fe17]" />`],
  ["a hex in script", `const ring = "#ffffff"`],
  [
    "a hex class beside a mask colour",
    `context.fillStyle = "#000000"; <span className="bg-[#fff]" />`,
  ],
  [
    "a colour function",
    `<span className="shadow-[0_2px_4px_rgba(0,0,0,.1)]" />`,
  ],
  ["an arbitrary height", `<span className="h-[48px]" />`],
  ["an arbitrary radius", `<span className="rounded-[10px]" />`],
  ["an arbitrary duration", `<span className="duration-[200ms]" />`],
  ["a duration in seconds", `<span className="[transition:opacity_0.2s]" />`],
  ["a hex after an underscore", `<span className="shadow-[0_0_0_1px_#fff]" />`],
  [
    "a length after an underscore",
    `<span className="shadow-[0_2px_4px_var(--x)]" />`,
  ],
  [
    "a duration after an underscore",
    `<span className="[transition:opacity_200ms]" />`,
  ],
  [
    "whole seconds after an underscore",
    `<span className="[transition:opacity_2s]" />`,
  ],
  [
    "an inset after an underscore",
    `<span className="inset-[auto_12px_8px_auto]" />`,
  ],
  ["a length in script", `const fallback = "768px"`],
  ["an inline size", `<span style={{ borderRadius: 12 }} />`],
  ["an inline length", `<span style={{ width: "120px" }} />`],
]

const allowed: ReadonlyArray<[string, string]> = [
  ["a spacing step", `<span className="h-12 gap-2 px-4" />`],
  ["a token fill", `<span className="bg-(--well) text-ink" />`],
  ["a token duration", `<span className="duration-(--duration-press)" />`],
  ["a ratio", `<span className="aspect-[9/16]" />`],
  ["a share of the viewport", `<span className="max-h-[20dvh]" />`],
  ["an aspect from data", `<span style={{ aspectRatio: "16 / 9" }} />`],
  ["a link to a fragment", `<a href="/explore#add" />`],
  ["a mask colour a canvas paints", `context.strokeStyle = "#ffffff"`],
  ["a mask colour a canvas fills", `context.fillStyle = "#000000"`],
  [
    "a token timing in an arbitrary property",
    `<span className="[transition:height_var(--control-change)]" />`,
  ],
  [
    "a token shadow in an arbitrary value",
    `<span className="shadow-[0_0_0_var(--ring-width)_var(--ring)]" />`,
  ],
]

describe("token discipline", () => {
  it.each(planted)("refuses %s", (_name, text) => {
    expect(refusalsIn("planted.tsx", text)).not.toEqual([])
  })

  it.each(allowed)("lets %s pass", (_name, text) => {
    expect(refusalsIn("allowed.tsx", text)).toEqual([])
  })

  it("reads every component and every screen", () => {
    const files = Object.keys(sources)
    expect(files.some((file) => file.includes("/components/button.tsx"))).toBe(
      true
    )
    expect(files.some((file) => file.includes("/screens/"))).toBe(true)
    expect(files.some((file) => file.endsWith(".ts"))).toBe(true)
    expect(files.some((file) => file.endsWith(".generated.ts"))).toBe(false)
  })

  it("keeps one width switch, at 768 px, and the 4 px spacing step", () => {
    const tokens = readSource("tokens.css")
    expect(tokens).toContain("--breakpoint-*: initial;")
    expect([...tokens.matchAll(/--container-[a-z]+:/g)]).toHaveLength(1)
    expect(tokens).toContain("--container-regular: 768px;")
    expect(tokens).not.toMatch(/--spacing:\s/)
  })

  it("lets a component scale on press only through the press preset", () => {
    const own = /(?:hover|active|in-data-\[gallery=press\]):(?:-)?scale-/
    expect(own.test(`<span className="active:scale-95" />`)).toBe(true)
    expect(own.test(`<span className={motion.press} />`)).toBe(false)
    const scaling = Object.entries(sources)
      .filter(([, text]) => own.test(text))
      .map(([file]) => file)
    expect(scaling).toEqual([])
    const pressing = Object.entries(sources).filter(([, text]) =>
      /motion\.press/.test(text)
    )
    expect(pressing.length).toBeGreaterThan(0)
  })

  it("finds no component or screen that writes its own value", () => {
    const refusals = Object.entries(sources).flatMap(([file, text]) =>
      refusalsIn(file, text)
    )
    expect(refusals).toEqual([])
  })
})
