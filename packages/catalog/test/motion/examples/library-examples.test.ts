import { createHash } from "node:crypto"
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import {
  approvedExamples,
  exampleOf,
  libraryExamples,
  readExamples,
} from "#motion/examples/library-examples"

const platform = fileURLToPath(
  new URL("../../../../../apps/platform/", import.meta.url)
)

const gateway = fileURLToPath(
  new URL("../../../../../services/gateway/", import.meta.url)
)

function sha256Of(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex")
}

describe("the Library's examples", () => {
  it("shows only Grab and run, the one example a maintainer approved, at 1080p in its 2:3 shape", () => {
    expect(approvedExamples.map((example) => example.id)).toEqual([
      "grab-and-run",
    ])
    const grab = exampleOf("grab-and-run")
    expect(grab.approval).toEqual({
      question:
        "Make the 1080p run, row 66, the Library example of Grab and run, and offer 1080p in Motion?",
      words: "Yes to 1080p",
      date: "2026-10-29",
    })
    expect(grab.preview).toMatchObject({
      resolution: "1080p",
      aspectRatio: "2:3",
      width: 1152,
      height: 1792,
      sha256:
        "8f49565df3d7a601482ce9db2eeb54a96a91936fba3b30802127fb4cb5e09a4c",
    })
  })

  it("keeps Push into the eye, Flip into a new place and Ticket wipe out until a maintainer approves each result", () => {
    for (const id of [
      "push-into-eye",
      "flip-into-a-new-place",
      "ticket-wipe",
    ]) {
      expect({ id, approved: exampleOf(id).approved }).toEqual({
        id,
        approved: false,
      })
    }
  })

  it("bundles each shown result with the sha256 and size its record names", () => {
    for (const example of approvedExamples) {
      const preview = example.preview
      const path = `${platform}src/showcase/media/${preview?.file}`
      expect({ id: example.id, sha256: sha256Of(path) }).toEqual({
        id: example.id,
        sha256: preview?.sha256,
      })
      expect(readFileSync(path).byteLength).toBe(preview?.bytes)
    }
  })

  it("holds each guide in the engine's folder with its sha256, apart from the shown results", () => {
    for (const example of libraryExamples) {
      const guide = example.guide
      if (guide === null) {
        continue
      }
      const path = `${gateway}src/effect-guides/files/${guide.file}`
      expect({ id: example.id, sha256: sha256Of(path) }).toEqual({
        id: example.id,
        sha256: guide.sha256,
      })
      expect(example.preview?.sha256).not.toBe(guide.sha256)
    }
  })

  it("refuses an approved example with no approval, or with no result to show", () => {
    const grab = exampleOf("grab-and-run")
    expect(() =>
      readExamples({ "grab-and-run": { ...grab, approval: null } }, [])
    ).toThrow(/approval An approved example carries the maintainer's approval/)
    expect(() =>
      readExamples({ "grab-and-run": { ...grab, preview: null } }, [])
    ).toThrow(/preview An approved example carries the result/)
  })

  it("refuses a result on an example neither a judge passed nor a maintainer approved, the control", () => {
    const grab = exampleOf("grab-and-run")
    expect(() =>
      readExamples(
        { "grab-and-run": { ...grab, approved: false, approval: null } },
        []
      )
    ).toThrow(/preview An example keeps a result only once/)
    expect(
      readExamples({ "grab-and-run": grab }, []).map((one) => one.id)
    ).toEqual(["grab-and-run"])
  })
})

describe("the platform's public assets", () => {
  it("hold no guide, so no visitor can download one", () => {
    const guides = new Set(
      libraryExamples.flatMap((example) =>
        example.guide === null ? [] : [example.guide.sha256]
      )
    )
    const files = readdirSync(`${platform}public`, {
      recursive: true,
      withFileTypes: true,
    }).filter((entry) => entry.isFile())
    expect(files.length).toBeGreaterThan(0)
    const held = files.filter((entry) =>
      guides.has(sha256Of(join(entry.parentPath, entry.name)))
    )
    expect(held.map((entry) => entry.name)).toEqual([])
  })
})
