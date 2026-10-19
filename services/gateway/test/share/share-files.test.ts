import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { R2AssetStore } from "#infrastructure/r2-asset-store"
import { filesystemShareFiles } from "#share/filesystem-share-files"
import { r2ShareFiles } from "#share/r2-share-files"

const bytes = Uint8Array.from({ length: 100 }, (_, index) => index)

async function bytesOf(body: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  return new Uint8Array(await new Response(body).arrayBuffer())
}

describe("a shared file's bytes", () => {
  it("asks the bucket for the asked range alone", async () => {
    const asked: unknown[] = []
    const bucket = {
      head: async () => ({ size: bytes.length }),
      get: async (key: string, options: unknown) => {
        asked.push({ key, options })
        return { body: new Response(bytes.slice(10, 20)).body }
      },
    }

    const part = await r2ShareFiles(bucket as unknown as R2Bucket).read(
      "shared-key",
      { start: 10, end: 19 }
    )

    expect(asked).toEqual([
      {
        key: `${R2AssetStore.prefix}shared-key`,
        options: { range: { offset: 10, length: 10 } },
      },
    ])
    expect(part?.range).toEqual({ start: 10, end: 19 })
    expect(part?.size).toBe(bytes.length)
  })

  it("reads the asked range from disk", async () => {
    const root = mkdtempSync(join(tmpdir(), "rosesfield-share-files-"))
    try {
      writeFileSync(join(root, "shared-key"), bytes)

      const part = await filesystemShareFiles(root).read("shared-key", {
        start: 90,
        end: 120,
      })

      expect(part?.range).toEqual({ start: 90, end: 99 })
      expect(await bytesOf(part?.body ?? new ReadableStream())).toEqual(
        bytes.slice(90, 100)
      )
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})
