import { afterEach, describe, expect, it } from "vitest"
import { routerMedia } from "#infrastructure/router-chat-media"
import { pngOf } from "../fixtures/media-files"
import {
  base64,
  closeRigs,
  imageModel,
  markersOf,
  messagesOf,
  partsOf,
  storedLibrary,
  toolTextOf,
  turnsWith,
} from "../fixtures/media-turns"
import type { RouterRequest } from "../fixtures/router-chat-answers"

afterEach(closeRigs)

const ephemeral = { type: "ephemeral" }
const flash = "deepseek/deepseek-v4.1-flash-1017"
const qwen = "qwen/qwen-plus"
const qwenVideo = "qwen/qwen3.6-plus"
const snapshotQwen = "qwen/qwen3.8-max-0902"

async function oneMessageOn(model: string): Promise<RouterRequest | undefined> {
  const { requests } = await turnsWith({
    model,
    library: storedLibrary().library,
    reads: [[]],
  })
  return requests[0]
}

function systemOf(request: RouterRequest | undefined): unknown {
  return messagesOf(request).find((message) => message.role === "system")
    ?.content
}

function lastToolOf(request: RouterRequest | undefined): unknown {
  const tools = request?.body.tools
  return Array.isArray(tools) ? tools.at(-1) : undefined
}

function lastToolResultOf(request: RouterRequest | undefined): unknown {
  return messagesOf(request)
    .filter((message) => message.role === "tool")
    .at(-1)?.content
}

function mp4(seed = 0): Uint8Array {
  return Uint8Array.of(0, 0, 0, 24, 102, 116, 121, 112, 109, 112, 52, 50, seed)
}

function markersIn(value: unknown): number {
  return JSON.stringify(value ?? null).split('"cache_control"').length - 1
}

function placesOf(request: RouterRequest | undefined): {
  system: number
  lastTool: number
  newest: number
  rest: number
} {
  const messages = messagesOf(request)
  const system = markersIn(systemOf(request))
  const lastTool = markersIn(lastToolOf(request))
  const newest = markersIn(messages.at(-1)?.content)
  return {
    system,
    lastTool,
    newest,
    rest: markersOf(request) - system - lastTool - newest,
  }
}

describe("the cache marker on the instructions and the tools", () => {
  it.each([imageModel, qwen])(
    "is on the system message and the last tool of a %s request",
    async (model) => {
      const request = await oneMessageOn(model)

      expect(systemOf(request)).toEqual([
        expect.objectContaining({ type: "text", cache_control: ephemeral }),
      ])
      expect(lastToolOf(request)).toMatchObject({ cache_control: ephemeral })
    }
  )

  it("control: is nowhere in a DeepSeek request, whose lab caches with no marker", async () => {
    const request = await oneMessageOn(flash)

    expect(request?.body.model).toBe(flash)
    expect(markersOf(request)).toBe(0)
    expect(typeof systemOf(request)).toBe("string")
  })

  it.each([snapshotQwen, "qwen/qwen3.7-max", "qwen/qwen3-coder"])(
    "control: is nowhere in a %s request, a Qwen model the guide does not name for explicit caching",
    async (model) => {
      const request = await oneMessageOn(model)

      expect(request?.body.model).toBe(model)
      expect(markersOf(request)).toBe(0)
      expect(typeof systemOf(request)).toBe("string")
    }
  )

  it("is exactly on the system message, the last tool and the newest message of every request of a Claude turn that reads media, so one marker covers the conversation", async () => {
    const stored = storedLibrary()
    const first = await stored.add({ width: 4, height: 3 }, pngOf(4, 3))
    const second = await stored.add({ width: 5, height: 3 }, pngOf(5, 3))

    const { requests } = await turnsWith({
      model: imageModel,
      library: stored.library,
      reads: [],
      steps: [[[first.id], [second.id]], []],
    })

    expect(requests.length).toBeGreaterThanOrEqual(3)
    for (const request of requests) {
      expect(placesOf(request)).toEqual({
        system: 1,
        lastTool: 1,
        newest: 1,
        rest: 0,
      })
    }
  })
})

describe("the media a marked request carries", () => {
  it("reaches a marked Qwen request as a video_url part from a tool result whose text is an array, which keeps its marker", async () => {
    const stored = storedLibrary()
    const clip = await stored.add(
      { kind: "video", mime: "video/mp4", durationSeconds: 5 },
      mp4()
    )

    const { requests } = await turnsWith({
      model: qwenVideo,
      library: stored.library,
      reads: [[clip.id]],
    })

    expect(lastToolResultOf(requests[1])).toEqual([
      expect.objectContaining({ type: "text", cache_control: ephemeral }),
    ])
    expect(partsOf(requests[1], "video_url")).toEqual([
      {
        type: "video_url",
        video_url: { url: `data:video/mp4;base64,${base64(mp4())}` },
      },
    ])
    expect(toolTextOf(requests[1])).not.toContain(routerMedia.markPrefix)
  })

  it("reaches a Claude request as an image_url part with the markers on", async () => {
    const stored = storedLibrary()
    const png = pngOf(4, 3)
    const image = await stored.add({ width: 4, height: 3 }, png)

    const { requests } = await turnsWith({
      model: imageModel,
      library: stored.library,
      reads: [[image.id]],
    })

    expect(lastToolOf(requests[1])).toMatchObject({ cache_control: ephemeral })
    expect(partsOf(requests[1], "image_url")).toEqual([
      {
        type: "image_url",
        image_url: { url: `data:image/png;base64,${base64(png)}` },
      },
    ])
  })

  it("keeps the turn's limit and sends each medium once, when the marked tool result holds the medium past the limit", async () => {
    const stored = storedLibrary()
    const ids: string[] = []
    for (let index = 0; index <= routerMedia.perTurn; index += 1) {
      const clip = await stored.add(
        { kind: "video", mime: "video/mp4", durationSeconds: 5 },
        mp4(index)
      )
      ids.push(clip.id)
    }

    const { requests } = await turnsWith({
      model: qwenVideo,
      library: stored.library,
      reads: [ids, []],
    })

    expect(JSON.stringify(lastToolResultOf(requests[1]))).toContain(
      `one turn sends at most ${routerMedia.perTurn} media`
    )
    expect(lastToolResultOf(requests[1])).toEqual([
      expect.objectContaining({ type: "text", cache_control: ephemeral }),
    ])
    expect(partsOf(requests[1], "video_url")).toHaveLength(routerMedia.perTurn)
    expect(toolTextOf(requests[1])).not.toContain(routerMedia.markPrefix)
    expect(partsOf(requests[2], "video_url")).toEqual([])
    expect(toolTextOf(requests[2])).toContain(
      "received this media in an earlier request"
    )
  })
})
