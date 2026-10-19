import { concatBytes } from "#infrastructure/demo/concat-bytes"
import {
  type FlatH264Stream,
  flatH264Stream,
} from "#infrastructure/demo/flat-h264"

type FlatMp4Options = {
  width: number
  height: number
  seconds: number
}

type Track = FlatMp4Options & {
  stream: FlatH264Stream
  samples: Uint8Array[]
}

const timescale = 1000
const frameMs = 200
const matrix = [0x00010000, 0, 0, 0, 0x00010000, 0, 0, 0, 0x40000000]

export function writeFlatMp4(options: FlatMp4Options): Uint8Array {
  const stream = flatH264Stream(options)
  const frames = Math.max(1, Math.round((options.seconds * 1000) / frameMs))
  const samples = Array.from({ length: frames }, (_, index) => {
    const unit = stream.frame(index)
    return concatBytes([u32(unit.length), unit])
  })
  const track: Track = { ...options, stream, samples }
  const ftyp = box("ftyp", ascii("isom"), u32(0x200), ascii("isomiso2avc1mp41"))
  const offset = ftyp.length + movie(track, 0).length + 8
  return concatBytes([ftyp, movie(track, offset), box("mdat", ...samples)])
}

function movie(track: Track, offset: number): Uint8Array {
  const duration = track.samples.length * frameMs
  const mvhd = box(
    "mvhd",
    u32(0, 0, 0, timescale, duration, 0x00010000),
    u16(0x0100, 0),
    u32(0, 0, ...matrix, 0, 0, 0, 0, 0, 0, 2)
  )
  const tkhd = box(
    "tkhd",
    u32(3, 0, 0, 1, 0, duration, 0, 0),
    u16(0, 0, 0, 0),
    u32(...matrix, track.width * 0x10000, track.height * 0x10000)
  )
  const mdhd = box("mdhd", u32(0, 0, 0, timescale, duration), u16(0x55c4, 0))
  const hdlr = box(
    "hdlr",
    u32(0, 0),
    ascii("vide"),
    u32(0, 0, 0),
    ascii("Flat\0")
  )
  const minf = box(
    "minf",
    box("vmhd", u32(1), u16(0, 0, 0, 0)),
    box("dinf", box("dref", u32(0, 1), box("url ", u32(1)))),
    sampleTable(track, offset)
  )
  return box("moov", mvhd, box("trak", tkhd, box("mdia", mdhd, hdlr, minf)))
}

function sampleTable(track: Track, offset: number): Uint8Array {
  const { sps, pps } = track.stream
  const avcC = box(
    "avcC",
    Uint8Array.of(1, sps[1] ?? 0, sps[2] ?? 0, sps[3] ?? 0, 0xff, 0xe1),
    u16(sps.length),
    sps,
    Uint8Array.of(1),
    u16(pps.length),
    pps
  )
  const avc1 = box(
    "avc1",
    new Uint8Array(6),
    u16(1, 0, 0),
    u32(0, 0, 0),
    u16(track.width, track.height),
    u32(0x00480000, 0x00480000, 0),
    u16(1),
    new Uint8Array(32),
    u16(0x0018, 0xffff),
    avcC
  )
  const count = track.samples.length
  const sizes = track.samples.map((sample) => sample.length)
  return box(
    "stbl",
    box("stsd", u32(0, 1), avc1),
    box("stts", u32(0, 1, count, frameMs)),
    box("stss", u32(0, 1, 1)),
    box("stsc", u32(0, 1, 1, count, 1)),
    box("stsz", u32(0, 0, count, ...sizes)),
    box("stco", u32(0, 1, offset))
  )
}

function box(type: string, ...parts: Uint8Array[]): Uint8Array {
  const body = concatBytes(parts)
  return concatBytes([u32(body.length + 8), ascii(type), body])
}

function u32(...values: number[]): Uint8Array {
  const out = new Uint8Array(values.length * 4)
  const view = new DataView(out.buffer)
  values.forEach((value, index) => {
    view.setUint32(index * 4, value >>> 0)
  })
  return out
}

function u16(...values: number[]): Uint8Array {
  const out = new Uint8Array(values.length * 2)
  const view = new DataView(out.buffer)
  values.forEach((value, index) => {
    view.setUint16(index * 2, value)
  })
  return out
}

function ascii(text: string): Uint8Array {
  return new TextEncoder().encode(text)
}
