import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { creditsOfCost } from "@rosesfield/catalog/comfy"
import { describe, expect, it } from "vitest"
import { promptInputOf } from "@/catalog/app-facts"
import { findCatalogApp } from "@/catalog/catalog-apps"
import { runModel } from "@/pieces/run/run-facts"
import {
  mediaOf,
  showcaseItems,
  showcaseItemsOf,
  showcaseOf,
} from "@/showcase/showcase"
import { type ShowcaseRow, showcaseRows } from "@/showcase/showcase-rows"

const folders = [
  join(import.meta.dirname, "../../src/showcase/media"),
  join(import.meta.dirname, "../../src/studio/effects/previews"),
]

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
    expect(showcaseItems.map((item) => item.file)).toEqual(
      showcaseRows.map((row) => row.file)
    )
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
    expect(models["portrait-man.webp"]).toBe("Qwen Image 2512")
    expect(models["portrait-woman.webp"]).toBe("Z-Image Turbo")
    expect(models["push-into-eye.mp4"]).toBe("LTX 2.5")
  })

  it("gives each app only its own examples", () => {
    expect(showcaseOf("effects").map((item) => item.file)).toEqual([
      "push-into-eye.mp4",
    ])
    expect(showcaseOf("lipsync")).toEqual([])
  })
})
