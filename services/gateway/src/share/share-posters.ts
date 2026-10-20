export type Poster = {
  bytes: Uint8Array
  mime: string
}

export type SharePosters = {
  /** Draws the first frame of a video's own bytes as a still image, or null when it cannot. */
  frameOf: (video: Uint8Array, mime: string) => Promise<Poster | null>
}

export const posterLongSide = 1280

export function posterSizeOf(
  width: number | null,
  height: number | null
): { width: number | null; height: number | null } {
  if (width === null || height === null) {
    return { width: null, height: null }
  }
  const scale = Math.min(1, posterLongSide / Math.max(width, height))
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  }
}
