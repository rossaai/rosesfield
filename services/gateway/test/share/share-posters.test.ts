import type { AssetId } from "@rosesfield/kernel"
import { AssetStore } from "@rosesfield/library"
import { describe, expect, it } from "vitest"
import { withPoster } from "#share/create-share"
import { mediaSharePosters } from "#share/media-share-posters"
import {
  type Poster,
  posterSizeOf,
  type SharePosters,
} from "#share/share-posters"
import type { SharedMedia } from "#share/share-tables"

class MemoryAssetStore extends AssetStore {
  readonly files = new Map<string, { bytes: Uint8Array; mime: string }>()

  override async put(
    id: AssetId,
    bytes: Uint8Array,
    mime: string
  ): Promise<void> {
    this.files.set(id, { bytes, mime })
  }

  override async get(id: AssetId): Promise<Uint8Array | null> {
    return this.files.get(id)?.bytes ?? null
  }

  override async delete(id: AssetId): Promise<void> {
    this.files.delete(id)
  }

  override async link(id: AssetId): Promise<string> {
    return `/assets/${id}`
  }
}

const frame = new TextEncoder().encode("jpeg-frame")
const video = new TextEncoder().encode("mp4-bytes")

function drawing(
  answer: Poster | null
): SharePosters & { asked: Uint8Array[] } {
  const asked: Uint8Array[] = []
  return {
    asked,
    frameOf: async (bytes) => {
      asked.push(bytes)
      return answer
    },
  }
}

function mediaOf(kind: SharedMedia["kind"]): SharedMedia {
  return {
    key: "8f1a2b3c-4d5e-4f60-8a7b-9c0d1e2f3a4b",
    kind,
    mime: kind === "video" ? "video/mp4" : "image/png",
    width: 1920,
    height: 1080,
    durationSeconds: kind === "video" ? 5 : null,
  }
}

describe("a shared video's poster", () => {
  it("is drawn from the video's own bytes and kept as a public file", async () => {
    const store = new MemoryAssetStore()
    const posters = drawing({ bytes: frame, mime: "image/jpeg" })

    const shared = await withPoster({ store, posters }, mediaOf("video"), video)

    expect(posters.asked).toEqual([video])
    expect(shared.poster?.mime).toBe("image/jpeg")
    expect(store.files.get(shared.poster?.key ?? "")).toEqual({
      bytes: frame,
      mime: "image/jpeg",
    })
  })

  it("is not drawn for an image, and is left out when no frame comes back", async () => {
    const store = new MemoryAssetStore()
    const posters = drawing(null)

    const image = await withPoster({ store, posters }, mediaOf("image"), video)
    const blank = await withPoster({ store, posters }, mediaOf("video"), video)

    expect(posters.asked).toEqual([video])
    expect(image.poster).toBeUndefined()
    expect(blank.poster).toBeUndefined()
    expect(store.files.size).toBe(0)
  })

  it("keeps the video's shape with its long side at most 1280 pixels", () => {
    expect(posterSizeOf(1920, 1080)).toEqual({ width: 1280, height: 720 })
    expect(posterSizeOf(720, 1280)).toEqual({ width: 720, height: 1280 })
    expect(posterSizeOf(640, 360)).toEqual({ width: 640, height: 360 })
    expect(posterSizeOf(null, 360)).toEqual({ width: null, height: null })
  })
})

type Asked = { transform: unknown; output: unknown; input: Uint8Array }

function mediaBinding(
  answer: () => Promise<ReadableStream<Uint8Array>>,
  asked: Asked[]
): MediaBinding {
  return {
    input: (stream) => {
      const generator = (transform: unknown): MediaTransformationGenerator => ({
        output: (output) => {
          const read = new Response(stream).arrayBuffer()
          const result: MediaTransformationResult = {
            media: async () => {
              asked.push({
                transform,
                output,
                input: new Uint8Array(await read),
              })
              return answer()
            },
            response: async () => new Response(await answer()),
            contentType: async () => "image/jpeg",
          }
          return result
        },
      })
      return {
        transform: (transform) => generator(transform),
        output: (output) => generator(undefined).output(output),
      }
    },
  }
}

describe("the poster drawn by Cloudflare's media binding", () => {
  it("asks for the first frame as a JPEG that fits 1280 pixels", async () => {
    const asked: Asked[] = []
    const posters = mediaSharePosters(
      mediaBinding(
        async () => new Response(frame).body ?? new ReadableStream(),
        asked
      )
    )

    const poster = await posters.frameOf(video, "video/mp4")

    expect(poster).toEqual({ bytes: frame, mime: "image/jpeg" })
    expect(asked).toEqual([
      {
        transform: { width: 1280, height: 1280, fit: "scale-down" },
        output: { mode: "frame", time: "0s", format: "jpg" },
        input: video,
      },
    ])
  })

  it("gives no poster when the binding refuses the video, so the share still opens", async () => {
    const posters = mediaSharePosters(
      mediaBinding(async () => {
        throw new Error("MEDIA_ERROR: unsupported input")
      }, [])
    )

    expect(await posters.frameOf(video, "video/mp4")).toBeNull()
  })
})
