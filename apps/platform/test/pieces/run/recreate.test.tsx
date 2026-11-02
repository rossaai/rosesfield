import { readdirSync, readFileSync } from "node:fs"
import { join, relative } from "node:path"
import { PresetTile } from "@rosesfield/ui/components/preset-tile"
import { ResultTile } from "@rosesfield/ui/components/result-tile"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { copy } from "@/copy.en"

afterEach(cleanup)

const sourceRoot = join(import.meta.dirname, "../../../src")
const recreateModule = "pieces/run/recreate.tsx"
const recreateGlyph = "lucide-repeat"

function listFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      return listFiles(path)
    }
    return /\.tsx?$/.test(entry.name) ? [path] : []
  })
}

const sources = listFiles(sourceRoot).map((path) => ({
  file: relative(sourceRoot, path),
  text: readFileSync(path, "utf8"),
}))

const recreateKeys = Object.entries(copy)
  .filter(([, value]) => value === "Recreate")
  .map(([key]) => key)

function glyphsOf(control: HTMLElement): string[] {
  return [...control.querySelectorAll("svg")].flatMap((svg) =>
    [...svg.classList].filter(
      (name) => name.startsWith("lucide-") && !name.endsWith("-icon")
    )
  )
}

describe("Recreate, one action with one label and one glyph", () => {
  it("names the action with one copy key, and no copy says Remix or Use inputs", () => {
    expect(recreateKeys).toEqual(["run.recreate"])
    const others = Object.entries(copy).filter(([, value]) =>
      /\bremix|\buse inputs\b/i.test(value)
    )
    expect(others).toEqual([])
  })

  it("reads the label only in the one Recreate module", () => {
    const readers = sources.flatMap(({ file, text }) =>
      recreateKeys.some((key) => text.includes(`t("${key}"`)) ? [file] : []
    )
    expect(readers).toEqual([recreateModule])
  })

  it("hands the bare label only to a piece that draws the glyph itself", () => {
    const loose = sources.flatMap(({ file, text }) => {
      if (file === recreateModule) {
        return []
      }
      return [...text.matchAll(/recreateLabel\(\)/g)].flatMap((match) => {
        const before = text.slice(0, match.index)
        return /(recreateLabel=\{|label: )$/.test(before) ? [] : [file]
      })
    })
    expect(loose).toEqual([])
  })

  it("draws repeat on the Recreate words a button holds", async () => {
    const { RecreateWords } = await import(
      /* @vite-ignore */ `@/${recreateModule.replace(/\.tsx$/, "")}`
    )
    render(
      <button type="button">
        <RecreateWords />
      </button>
    )
    const button = screen.getByRole("button", { name: "Recreate" })
    expect(glyphsOf(button)).toEqual([recreateGlyph])
  })

  it("draws repeat on a result tile's Recreate", () => {
    render(
      <ResultTile
        kind="image"
        src="result.png"
        alt="A result"
        aspect={{ width: 1, height: 1 }}
        app="Image"
        openLabel="Open"
        expandLabel="Expand"
        moreLabel="More"
        recreateLabel="Recreate"
        recreateName="Recreate this result"
        onOpen={() => undefined}
        onRecreate={() => undefined}
      />
    )
    const button = screen.getByRole("button", {
      name: "Recreate this result",
    })
    expect(glyphsOf(button)).toEqual([recreateGlyph])
  })

  it("draws repeat on a template tile's Recreate", () => {
    render(
      <PresetTile
        name="Capybara"
        href="/apps/ai-influencer?example=capybara"
        viewLabel="Recreate Capybara"
        action={{
          label: "Recreate",
          href: "/apps/ai-influencer?example=capybara",
        }}
        clip={{ src: "capybara.png", alt: "Capybara", kind: "image" }}
        aspect={{ width: 1, height: 1 }}
      />
    )
    const action = screen.getByRole("link", { name: "Recreate" })
    expect(glyphsOf(action)).toEqual([recreateGlyph])
  })
})
