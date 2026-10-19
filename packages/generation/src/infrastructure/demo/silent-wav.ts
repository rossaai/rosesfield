type SilentWavOptions = {
  seconds: number
  sampleRate: number
}

const headerBytes = 44

export function writeSilentWav(options: SilentWavOptions): Uint8Array {
  const dataBytes = Math.round(options.seconds * options.sampleRate) * 2
  const out = new Uint8Array(headerBytes + dataBytes)
  const view = new DataView(out.buffer)
  const text = new TextEncoder()
  out.set(text.encode("RIFF"), 0)
  view.setUint32(4, 36 + dataBytes, true)
  out.set(text.encode("WAVEfmt "), 8)
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, options.sampleRate, true)
  view.setUint32(28, options.sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  out.set(text.encode("data"), 36)
  view.setUint32(40, dataBytes, true)
  return out
}
