import { describe, expect, it } from "vitest"
import {
  addedRecordingOf,
  audioFilesOf,
  RecordingNames,
} from "@/studio/audio/recording-names"

const first = "0a1b2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c01"
const second = "0a1b2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c02"

function wav(name: string, bytes: number): File {
  return new File([new Uint8Array(bytes)], name, { type: "audio/wav" })
}

describe("the name of a recording you add", () => {
  it("is the file's own name once its upload is stored", () => {
    const names = new RecordingNames()
    names.remember({ id: first, file: wav("interview.wav", 1200) })
    expect(names.nameOf({ id: first, bytes: 1200 })).toBe("interview.wav")
  })

  it("is not given to a stored file of another size under that id", () => {
    const names = new RecordingNames()
    names.remember({ id: first, file: wav("interview.wav", 1200) })
    expect(names.nameOf({ id: first, bytes: 900 })).toBeNull()
  })

  it("is unknown for a recording added from the library", () => {
    expect(new RecordingNames().nameOf({ id: second, bytes: 1200 })).toBeNull()
  })
})

describe("the recording a well adds", () => {
  it("pairs the one new id with the first audio file offered", () => {
    const file = wav("take.wav", 10)
    expect(addedRecordingOf([], [first], [file])).toEqual({ id: first, file })
  })

  it("pairs nothing when no file was offered, as from the library", () => {
    expect(addedRecordingOf([], [first], [])).toBeNull()
  })

  it("pairs nothing when the upload stored no new id", () => {
    expect(addedRecordingOf([first], [first], [wav("take.wav", 10)])).toBeNull()
  })

  it("keeps only the audio files of a drop", () => {
    const notes = new File(["notes"], "notes.txt", { type: "text/plain" })
    const take = wav("take.wav", 10)
    expect(audioFilesOf([notes, take])).toEqual([take])
  })
})
