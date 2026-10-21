export type Waveform = {
  peaks: number[]
  seconds: number
}

export const waveformBars = 64

const decodeRate = 8000

export function peaksOf(
  channels: readonly Float32Array[],
  bars: number
): number[] {
  const length = channels[0]?.length ?? 0
  if (length === 0 || bars < 1) {
    return []
  }
  const raw = Array.from({ length: bars }, (_, bar) => {
    const start = Math.floor((bar * length) / bars)
    const end = Math.max(start + 1, Math.floor(((bar + 1) * length) / bars))
    let peak = 0
    for (const channel of channels) {
      for (let index = start; index < end && index < length; index += 1) {
        peak = Math.max(peak, Math.abs(channel[index] ?? 0))
      }
    }
    return peak
  })
  const loudest = Math.max(...raw)
  return loudest === 0 ? raw : raw.map((peak) => peak / loudest)
}

export function playedBarsOf(fraction: number, bars: number): number {
  return Math.round(Math.min(1, Math.max(0, fraction)) * bars)
}

export async function readWaveform(
  src: string,
  signal: AbortSignal
): Promise<Waveform | null> {
  if (typeof OfflineAudioContext === "undefined") {
    return null
  }
  const response = await fetch(src, { signal })
  if (!response.ok) {
    return null
  }
  const bytes = await response.arrayBuffer()
  const context = new OfflineAudioContext(1, 1, decodeRate)
  const audio = await context.decodeAudioData(bytes)
  const channels = Array.from({ length: audio.numberOfChannels }, (_, index) =>
    audio.getChannelData(index)
  )
  return { peaks: peaksOf(channels, waveformBars), seconds: audio.duration }
}
