import { existsSync, readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { creditsOfCost } from "@rosesfield/catalog/comfy"
import { approvedExamples } from "@rosesfield/catalog/motion"
import { describe, expect, it } from "vitest"
import { promptInputOf } from "@/catalog/app-facts"
import { findCatalogApp } from "@/catalog/catalog-apps"
import { runModel } from "@/pieces/run/run-facts"
import {
  exampleRowsOf,
  mediaOf,
  showcaseItems,
  showcaseItemsOf,
  showcaseOf,
} from "@/showcase/showcase"
import { type ShowcaseRow, showcaseRows } from "@/showcase/showcase-rows"

const folders = [join(import.meta.dirname, "../../src/showcase/media")]

function bytesOf(file: string): Buffer {
  const path = folders
    .map((folder) => join(folder, file))
    .find((one) => existsSync(one))
  if (path === undefined) {
    throw new Error(`${file} is in no media folder`)
  }
  return readFileSync(path)
}

type Size = { width: number; height: number }

function webpSize(bytes: Buffer): Size {
  const chunk = bytes.toString("ascii", 12, 16)
  expect(["VP8 ", "VP8X"]).toContain(chunk)
  if (chunk === "VP8X") {
    return {
      width: bytes.readUIntLE(24, 3) + 1,
      height: bytes.readUIntLE(27, 3) + 1,
    }
  }
  return {
    width: bytes.readUInt16LE(26) & 0x3fff,
    height: bytes.readUInt16LE(28) & 0x3fff,
  }
}

function mp4Size(bytes: Buffer): Size {
  let at = bytes.indexOf("tkhd")
  while (at !== -1) {
    const box = at - 4
    const width = bytes.readUInt32BE(box + 84) / 65536
    const height = bytes.readUInt32BE(box + 88) / 65536
    if (width > 0 && height > 0) {
      return { width, height }
    }
    at = bytes.indexOf("tkhd", at + 4)
  }
  throw new Error("the clip holds no video track")
}

function sizeOf(row: ShowcaseRow): Size {
  const bytes = bytesOf(row.file)
  return row.kind === "image" ? webpSize(bytes) : mp4Size(bytes)
}

describe("the showcase", () => {
  it("bundles every row's file with the app, so a visitor sees it with no share and no key", () => {
    expect(showcaseItems.map((item) => item.file)).toEqual([
      ...exampleRowsOf(approvedExamples).map((row) => row.file),
      ...showcaseRows.map((row) => row.file),
    ])
    for (const item of showcaseItems) {
      expect(item.src).toMatch(/^\/src\//)
      expect(item.src).toContain(item.file)
    }
    expect(mediaOf("gone.webp")).toBeNull()
  })

  it("shows no item for a row whose file is missing, because proof is real or absent", () => {
    const [first] = showcaseRows
    if (first === undefined) {
      throw new Error("the showcase holds no row")
    }
    const missing = { ...first, file: "gone.webp" }
    expect(showcaseItemsOf([missing, first]).map((item) => item.file)).toEqual([
      first.file,
    ])
  })

  it("names each file's own width and height", () => {
    for (const row of showcaseRows) {
      expect(sizeOf(row), row.file).toEqual({
        width: row.width,
        height: row.height,
      })
    }
  })

  it("bundles every input a pair names, and no file that no row or input names", () => {
    const named = new Set([
      ...showcaseRows.flatMap((row) =>
        row.input === undefined ? [row.file] : [row.file, row.input.file]
      ),
      ...exampleRowsOf(approvedExamples).map((row) => row.file),
    ])
    const bundled = readdirSync(folders[0] ?? "")
    expect(bundled.sort()).toEqual([...named].sort())
  })

  it("makes every example with a model in the top ten of its task, except the input of a pair and an app's own graph", () => {
    const inputs = new Set(showcaseRows.flatMap((row) => [row.input?.file]))
    const hosted = showcaseRows.filter(
      (row) => !inputs.has(row.file) && row.model.includes("/")
    )
    expect(hosted.map((row) => row.model)).not.toContain(
      "byteplus/seedream-5-0-flash-260915"
    )
    expect(
      showcaseRows.some((row) => row.model.startsWith("z_image_turbo"))
    ).toBe(false)
  })

  it("lands the banner's end on the app that made it, and holds both faces from the top", () => {
    const start = showcaseRows.find((row) => row.banner === "start")
    const end = showcaseRows.find((row) => row.banner === "end")
    expect(start?.file).toBe("hose-garden.webp")
    expect(end?.appId).toBe("edit")
    expect(end?.input?.file).toBe(start?.file)
    expect([start?.focus, end?.focus]).toEqual(["top", "top"])
  })

  it("keeps each run's app, model, prompt and measured credits", () => {
    for (const item of showcaseItems) {
      const app = findCatalogApp(item.appId)
      expect(app, item.file).not.toBeNull()
      expect(runModel(item.run, app), item.file).not.toBeNull()
      expect(item.run.cost).not.toBeNull()
      expect(creditsOfCost(item.run.cost ?? { amount: 0 })).toBeCloseTo(
        item.credits,
        6
      )
      const prompt = app === null ? null : promptInputOf(app)
      expect(
        prompt === null ? null : (item.run.inputs[prompt.name] ?? null),
        item.file
      ).toBe(item.prompt)
    }
    const models = Object.fromEntries(
      showcaseItems.map((item) => [
        item.file,
        runModel(item.run, findCatalogApp(item.appId)),
      ])
    )
    expect(models["flamingo-bus-stop.webp"]).toBe("GPT Image 2.5 Sunburst")
    expect(models["sunflower-field.webp"]).toBe("Seedream 5.0 Pro")
    expect(models["grab-and-run.mp4"]).toBe("LTX 2.5")
  })

  it("gives each app only its own examples", () => {
    expect(showcaseOf("motion").map((item) => item.file)).toEqual([
      "grab-and-run.mp4",
    ])
    expect(showcaseOf("image")[0]?.file).toBe("flamingo-bus-stop.webp")
    expect(showcaseOf("edit").map((item) => item.file)).toEqual([
      "camper-van-cake.webp",
      "hose-flowers.webp",
    ])
    expect(showcaseOf("lipsync")).toEqual([])
  })
})
