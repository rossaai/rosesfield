import { BitWriter } from "#infrastructure/demo/bit-writer"

type FlatH264Options = {
  width: number
  height: number
}

export type FlatH264Stream = {
  sps: Uint8Array
  pps: Uint8Array
  frame: (index: number) => Uint8Array
}

const profile = 66
const constraints = 0xc0
const level = 30
const frameNumBits = 4

export function flatH264Stream(options: FlatH264Options): FlatH264Stream {
  const widthMbs = Math.ceil(options.width / 16)
  const heightMbs = Math.ceil(options.height / 16)
  const macroblocks = widthMbs * heightMbs
  const idr = nal(0x65, idrSlice(macroblocks))
  return {
    sps: nal(0x67, sequenceSet(options, widthMbs, heightMbs)),
    pps: nal(0x68, pictureSet()),
    frame: (index) =>
      index === 0 ? idr : nal(0x41, skipSlice(index, macroblocks)),
  }
}

function sequenceSet(
  options: FlatH264Options,
  widthMbs: number,
  heightMbs: number
): Uint8Array {
  const out = new BitWriter()
  out.bits(profile, 8)
  out.bits(constraints, 8)
  out.bits(level, 8)
  out.ue(0)
  out.ue(frameNumBits - 4)
  out.ue(2)
  out.ue(1)
  out.bit(0)
  out.ue(widthMbs - 1)
  out.ue(heightMbs - 1)
  out.bit(1)
  out.bit(1)
  const cropRight = (widthMbs * 16 - options.width) / 2
  const cropBottom = (heightMbs * 16 - options.height) / 2
  const cropped = cropRight > 0 || cropBottom > 0
  out.bit(cropped ? 1 : 0)
  if (cropped) {
    out.ue(0)
    out.ue(cropRight)
    out.ue(0)
    out.ue(cropBottom)
  }
  out.bit(0)
  return out.finish()
}

function pictureSet(): Uint8Array {
  const out = new BitWriter()
  out.ue(0)
  out.ue(0)
  out.bit(0)
  out.bit(0)
  out.ue(0)
  out.ue(0)
  out.ue(0)
  out.bit(0)
  out.bits(0, 2)
  out.se(0)
  out.se(0)
  out.se(0)
  out.bit(1)
  out.bit(0)
  out.bit(0)
  return out.finish()
}

function idrSlice(macroblocks: number): Uint8Array {
  const out = new BitWriter()
  out.ue(0)
  out.ue(7)
  out.ue(0)
  out.bits(0, frameNumBits)
  out.ue(0)
  out.bit(0)
  out.bit(0)
  out.se(0)
  out.ue(1)
  for (let index = 0; index < macroblocks; index += 1) {
    out.ue(3)
    out.ue(0)
    out.se(0)
    out.bit(1)
  }
  return out.finish()
}

function skipSlice(index: number, macroblocks: number): Uint8Array {
  const out = new BitWriter()
  out.ue(0)
  out.ue(5)
  out.ue(0)
  out.bits(index % 2 ** frameNumBits, frameNumBits)
  out.bit(0)
  out.bit(0)
  out.bit(0)
  out.se(0)
  out.ue(1)
  out.ue(macroblocks)
  return out.finish()
}

function nal(header: number, payload: Uint8Array): Uint8Array {
  const out = [header]
  let zeros = 0
  for (const byte of payload) {
    if (zeros >= 2 && byte <= 3) {
      out.push(3)
      zeros = 0
    }
    out.push(byte)
    zeros = byte === 0 ? zeros + 1 : 0
  }
  return Uint8Array.from(out)
}
