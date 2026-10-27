import { afterEach, describe, expect, it } from "vitest"
import { routerMedia } from "#infrastructure/router-chat-media"
import { defaultChatModel } from "#infrastructure/router-chat-models"
import { pngOf, wavOf } from "../fixtures/media-files"
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
const qwen = "qwen/qwen-plus"
const omni = "qwen/qwen3.8-omni-flash"
const breakpointLimit = 4

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

function mp4(): Uint8Array {
  return Uint8Array.of(0, 0, 0, 24, 102, 116, 121, 112, 109, 112, 52, 50)
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
    const request = await oneMessageOn(defaultChatModel)

    expect(request?.body.model).toBe(defaultChatModel)
    expect(markersOf(request)).toBe(0)
    expect(typeof systemOf(request)).toBe("string")
  })

  it("stays within the four breakpoints Anthropic and Alibaba allow, in every request of a turn that reads many media", async () => {
    const stored = storedLibrary()
    const image = await stored.add({ width: 4, height: 3 }, pngOf(4, 3))
    const ids: string[] = [image.id]
    for (let index = 0; index < 2; index += 1) {
      const sound = await stored.add(
        { kind: "audio", mime: "audio/wav", durationSeconds: 1 },
        wavOf(400 + index)
      )
      ids.push(sound.id)
    }
    const clip = await stored.add(
      { kind: "video", mime: "video/mp4", durationSeconds: 5 },
      mp4()
    )

    const { requests } = await turnsWith({
      model: omni,
      library: stored.library,
      reads: [],
      steps: [[[...ids, clip.id], [image.id]], []],
    })

    expect(requests.length).toBeGreaterThanOrEqual(3)
    for (const request of requests) {
      expect(markersOf(request)).toBeGreaterThan(0)
      expect(markersOf(request)).toBeLessThanOrEqual(breakpointLimit)
    }
  })
})

describe("the media a marked request carries", () => {
  it("reaches a Qwen request as input_audio and video_url parts from a tool result whose text is an array, which keeps its marker", async () => {
    const stored = storedLibrary()
    const wav = wavOf(16_000)
    const sound = await stored.add(
      { kind: "audio", mime: "audio/wav", durationSeconds: 1 },
      wav
    )
    const clip = await stored.add(
      { kind: "video", mime: "video/mp4", durationSeconds: 5 },
      mp4()
    )

    const { requests } = await turnsWith({
      model: omni,
      library: stored.library,
      reads: [[sound.id, clip.id]],
    })

    expect(lastToolResultOf(requests[1])).toEqual([
      expect.objectContaining({ type: "text", cache_control: ephemeral }),
    ])
    expect(partsOf(requests[1], "input_audio")).toEqual([
      {
        type: "input_audio",
        input_audio: { data: base64(wav), format: "wav" },
      },
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
      const sound = await stored.add(
        { kind: "audio", mime: "audio/wav", durationSeconds: 1 },
        wavOf(800 + index)
      )
      ids.push(sound.id)
    }

    const { requests } = await turnsWith({
      model: omni,
      library: stored.library,
      reads: [ids, []],
    })

    expect(JSON.stringify(lastToolResultOf(requests[1]))).toContain(
      `one turn sends at most ${routerMedia.perTurn} media`
    )
    expect(partsOf(requests[1], "input_audio")).toHaveLength(
      routerMedia.perTurn
    )
    expect(toolTextOf(requests[1])).not.toContain(routerMedia.markPrefix)
    expect(partsOf(requests[2], "input_audio")).toEqual([])
    expect(toolTextOf(requests[2])).toContain(
      "received this media in an earlier request"
    )
  })
})
