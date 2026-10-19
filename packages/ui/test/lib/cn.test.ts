import { cn } from "@rosesfield/ui/lib/cn"
import { describe, expect, it } from "vitest"
import { readSource } from "../read-source"

const tokens = readSource("tokens.css")

function namesOf(namespace: string): string[] {
  const pattern = new RegExp(
    `--${namespace}-([a-z0-9_]+(?:-[a-z0-9_]+)*)\\s*:`,
    "g"
  )
  return [...tokens.matchAll(pattern)].flatMap((match) =>
    match[1] === undefined ? [] : [match[1]]
  )
}

const groups = [
  { namespace: "text", prefix: "text", other: "label" },
  { namespace: "radius", prefix: "rounded", other: "full" },
  { namespace: "spacing", prefix: "p", other: "s1" },
  { namespace: "shadow", prefix: "shadow", other: "seam" },
  { namespace: "ease", prefix: "ease", other: "bloom" },
]

describe("cn and tokens.css", () => {
  it.each(groups)(
    "reads every $namespace token as one class group",
    ({ namespace, prefix, other }) => {
      const names = namesOf(namespace)
      expect(names.length).toBeGreaterThan(2)
      for (const name of names) {
        expect(cn(`${prefix}-${other}`, `${prefix}-${name}`)).toBe(
          `${prefix}-${name}`
        )
      }
    }
  )

  it("keeps a text size beside a text color", () => {
    for (const name of namesOf("text")) {
      expect(cn(`text-${name}`, "text-ink")).toBe(`text-${name} text-ink`)
    }
  })
})
