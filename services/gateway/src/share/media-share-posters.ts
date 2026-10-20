import {
  type Poster,
  posterLongSide,
  type SharePosters,
} from "#share/share-posters"

export function mediaSharePosters(media: MediaBinding): SharePosters {
  return {
    frameOf: async (video): Promise<Poster | null> => {
      try {
        const result = media
          .input(new Response(video).body ?? new ReadableStream())
          .transform({
            width: posterLongSide,
            height: posterLongSide,
            fit: "scale-down",
          })
          .output({ mode: "frame", time: "0s", format: "jpg" })
        const [stream, mime] = await Promise.all([
          result.media(),
          result.contentType(),
        ])
        const bytes = new Uint8Array(await new Response(stream).arrayBuffer())
        return bytes.length === 0 ? null : { bytes, mime }
      } catch {
        return null
      }
    },
  }
}

export function sharePostersOf(
  media: MediaBinding | undefined
): SharePosters | undefined {
  return media === undefined ? undefined : mediaSharePosters(media)
}
