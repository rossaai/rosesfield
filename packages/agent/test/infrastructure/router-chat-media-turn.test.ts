import { afterEach, describe, expect, it, vi } from "vitest"
import { routerMedia } from "#infrastructure/router-chat-media"
import { pngOf, wavOf } from "../fixtures/media-files"
import {
  base64,
  closeRigs,
  mediaModel,
  messagesOf,
  partsOf,
  storedLibrary,
  toolTextOf,
  turnsWith,
} from "../fixtures/media-turns"

afterEach(closeRigs)

describe("an audio or a video the agent reads", () => {
  it("reaches the body as input_audio and video_url parts for a model that takes them", async () => {
    const stored = storedLibrary()
    const wav = wavOf(16_000)
    const mp4 = Uint8Array.of(0, 0, 0, 24, 102, 116, 121, 112, 109, 112, 52, 50)
    const sound = await stored.add(
      { kind: "audio", mime: "audio/wav", durationSeconds: 1 },
      wav
    )
    const clip = await stored.add(
      { kind: "video", mime: "video/mp4", durationSeconds: 5 },
      mp4
    )

    const { requests } = await turnsWith({
      model: mediaModel,
      library: stored.library,
      reads: [[sound.id, clip.id]],
    })

    expect(partsOf(requests[1], "input_audio")).toEqual([
      {
        type: "input_audio",
        input_audio: { data: base64(wav), format: "wav" },
      },
    ])
    expect(partsOf(requests[1], "video_url")).toEqual([
      {
        type: "video_url",
        video_url: { url: `data:video/mp4;base64,${base64(mp4)}` },
      },
    ])
    expect(toolTextOf(requests[1])).not.toContain(routerMedia.markPrefix)
  })

  it("sends the first part of a longer WAV within the bound, and says so", async () => {
    const stored = storedLibrary()
    const seconds = routerMedia.audio.seconds * 2
    const wav = wavOf(32_000)
    const sound = await stored.add(
      { kind: "audio", mime: "audio/wav", durationSeconds: seconds },
      wav
    )

    const { requests } = await turnsWith({
      model: mediaModel,
      library: stored.library,
      reads: [[sound.id]],
    })

    const [part] = partsOf(requests[1], "input_audio")
    const data = (part as { input_audio: { data: string } }).input_audio.data
    const sent = Buffer.from(data, "base64")
    expect(sent.length).toBe(16_022)
    expect(sent.readUInt32LE(4)).toBe(sent.length - 8)
    expect(sent.readUInt32LE(40)).toBe(sent.length - 44)
    expect(toolTextOf(requests[1])).toContain(
      `Only its first ${routerMedia.audio.seconds} seconds reach you`
    )
  })

  it("control: refuses a longer video with its note, because no runtime here cuts video", async () => {
    const stored = storedLibrary()
    const clip = await stored.add(
      {
        kind: "video",
        mime: "video/mp4",
        durationSeconds: routerMedia.video.seconds + 1,
      },
      Uint8Array.of(0, 0, 0, 24, 102, 116, 121, 112)
    )

    const { requests } = await turnsWith({
      model: mediaModel,
      library: stored.library,
      reads: [[clip.id]],
    })

    expect(partsOf(requests[1], "video_url")).toEqual([])
    expect(toolTextOf(requests[1])).toContain(
      `This video is longer than ${routerMedia.video.seconds} seconds`
    )
  })
})

describe("the media one turn sends", () => {
  it("is at most the turn's limit, and an earlier turn's media is not sent again", async () => {
    const stored = storedLibrary()
    const ids: string[] = []
    for (let index = 0; index <= routerMedia.perTurn; index += 1) {
      const sound = await stored.add(
        { kind: "audio", mime: "audio/wav", durationSeconds: 1 },
        wavOf(200 + index)
      )
      ids.push(sound.id)
    }

    const { requests } = await turnsWith({
      model: mediaModel,
      library: stored.library,
      reads: [ids, []],
    })

    expect(partsOf(requests[1], "input_audio")).toHaveLength(
      routerMedia.perTurn
    )
    expect(toolTextOf(requests[1])).toContain(
      `one turn sends at most ${routerMedia.perTurn} media`
    )
    expect(JSON.stringify(messagesOf(requests[0])[0])).toContain(
      "that media adds to the cost of the turn"
    )
    expect(partsOf(requests[2], "input_audio")).toEqual([])
    expect(toolTextOf(requests[2])).toContain(
      "received this media in an earlier request"
    )
  })
})

describe("a medium a turn reads in one step", () => {
  it("is sent in that step's request and only noted in the next step's", async () => {
    const stored = storedLibrary()
    const wav = wavOf(400)
    const sound = await stored.add(
      { kind: "audio", mime: "audio/wav", durationSeconds: 1 },
      wav
    )
    const image = await stored.add({ width: 4, height: 3 }, pngOf(4, 3))
    const clip = await stored.add(
      { kind: "video", mime: "video/mp4", durationSeconds: 5 },
      Uint8Array.of(0, 0, 0, 24, 102, 116, 121, 112, 109, 112, 52, 50)
    )

    const { requests } = await turnsWith({
      model: mediaModel,
      library: stored.library,
      reads: [],
      steps: [[[sound.id, image.id], [clip.id]]],
    })

    expect(partsOf(requests[1], "input_audio")).toHaveLength(1)
    expect(partsOf(requests[1], "image_url")).toHaveLength(1)
    expect(partsOf(requests[2], "input_audio")).toEqual([])
    expect(partsOf(requests[2], "image_url")).toEqual([])
    expect(partsOf(requests[2], "video_url")).toHaveLength(1)
    expect(JSON.stringify(requests[2]?.body)).not.toContain(base64(wav))
    expect(JSON.stringify(requests[2]?.body)).toContain(
      "received this media in an earlier request"
    )
  })

  it("counts toward one limit for the whole turn, over the media first sent in it", async () => {
    const stored = storedLibrary()
    const ids: string[] = []
    for (let index = 0; index <= routerMedia.perTurn; index += 1) {
      const sound = await stored.add(
        { kind: "audio", mime: "audio/wav", durationSeconds: 1 },
        wavOf(500 + index)
      )
      ids.push(sound.id)
    }

    const { requests } = await turnsWith({
      model: mediaModel,
      library: stored.library,
      reads: [],
      steps: [[ids.slice(0, 3), ids.slice(3)]],
    })

    expect(partsOf(requests[1], "input_audio")).toHaveLength(3)
    expect(partsOf(requests[2], "input_audio")).toHaveLength(1)
    expect(toolTextOf(requests[2])).toContain(
      `one turn sends at most ${routerMedia.perTurn} media`
    )
  })
})

describe("a medium whose read fails", () => {
  it("becomes the unread note, and the call still goes out, when the request's library is gone", async () => {
    const stored = storedLibrary()
    const sound = await stored.add(
      { kind: "audio", mime: "audio/wav", durationSeconds: 1 },
      wavOf(300)
    )

    const { requests } = await turnsWith({
      model: mediaModel,
      library: stored.library,
      reads: [[sound.id]],
      mediaReads: () => {
        throw new Error("The request's access is gone.")
      },
    })

    expect(requests).toHaveLength(2)
    expect(partsOf(requests[1], "input_audio")).toEqual([])
    expect(toolTextOf(requests[1])).toContain("The media could not be read")
  })

  it("uses none of the turn's places", async () => {
    const stored = storedLibrary()
    const missing = await stored.add(
      { kind: "audio", mime: "audio/wav", durationSeconds: 1 },
      wavOf(250)
    )
    await stored.library.store.delete(missing.id)
    const ids = [missing.id]
    for (let index = 0; index < routerMedia.perTurn; index += 1) {
      const sound = await stored.add(
        { kind: "audio", mime: "audio/wav", durationSeconds: 1 },
        wavOf(600 + index)
      )
      ids.push(sound.id)
    }

    const { requests } = await turnsWith({
      model: mediaModel,
      library: stored.library,
      reads: [ids],
    })

    expect(partsOf(requests[1], "input_audio")).toHaveLength(
      routerMedia.perTurn
    )
    expect(toolTextOf(requests[1])).toContain("The media could not be read")
    expect(toolTextOf(requests[1])).not.toContain("one turn sends at most")
  })
})

describe("the order a turn counts its media in", () => {
  it("is the order the turn read them, with pi's images in their place among the audio", async () => {
    const stored = storedLibrary()
    const image = await stored.add({ width: 4, height: 3 }, pngOf(4, 3))
    const ids = [image.id]
    for (let index = 0; index < routerMedia.perTurn; index += 1) {
      const sound = await stored.add(
        { kind: "audio", mime: "audio/wav", durationSeconds: 1 },
        wavOf(700 + index)
      )
      ids.push(sound.id)
    }

    const { requests } = await turnsWith({
      model: mediaModel,
      library: stored.library,
      reads: [ids],
    })

    expect(partsOf(requests[1], "image_url")).toHaveLength(1)
    expect(partsOf(requests[1], "input_audio")).toHaveLength(
      routerMedia.perTurn - 1
    )
    expect(toolTextOf(requests[1])).toContain(
      `one turn sends at most ${routerMedia.perTurn} media`
    )
  })
})

describe("the media of one library", () => {
  it("never reaches another library's turn: a read of its id answers that no asset has it", async () => {
    const mine = storedLibrary()
    const theirs = storedLibrary()
    const secret = wavOf(300)
    const theirSound = await theirs.add(
      { kind: "audio", mime: "audio/wav", durationSeconds: 1 },
      secret
    )
    const myImage = await mine.add({ width: 4, height: 3 }, pngOf(4, 3))

    const { requests } = await turnsWith({
      model: mediaModel,
      library: mine.library,
      reads: [[theirSound.id, myImage.id]],
    })

    const sent = JSON.stringify(requests.map((request) => request.body))
    expect(sent).not.toContain(base64(secret))
    expect(toolTextOf(requests[1])).toContain("No asset has the id")
    expect(partsOf(requests[1], "image_url")).toHaveLength(1)
  })
})

describe("a turn that sends media", () => {
  it("logs nothing, neither the media nor the key", async () => {
    const stored = storedLibrary()
    const sound = await stored.add(
      { kind: "audio", mime: "audio/wav", durationSeconds: 1 },
      wavOf(300)
    )
    const image = await stored.add({ width: 4, height: 3 }, pngOf(4, 3))
    const spies = (["log", "info", "warn", "error", "debug"] as const).map(
      (method) => vi.spyOn(console, method)
    )

    try {
      const { requests } = await turnsWith({
        model: mediaModel,
        library: stored.library,
        reads: [[sound.id, image.id]],
      })
      expect(partsOf(requests[1], "input_audio")).toHaveLength(1)
      expect(spies.map((spy) => spy.mock.calls.length)).toEqual([0, 0, 0, 0, 0])
    } finally {
      for (const spy of spies) {
        spy.mockRestore()
      }
    }
  })
})
