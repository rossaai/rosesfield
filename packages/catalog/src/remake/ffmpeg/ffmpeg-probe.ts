import { z } from "zod"

export type ReferenceProbe = {
  width: number | null
  height: number | null
  hasSound: boolean
}

const probed = z.object({
  streams: z
    .array(
      z.object({
        codec_type: z.string().optional(),
        width: z.number().int().positive().optional(),
        height: z.number().int().positive().optional(),
      })
    )
    .default([]),
})

export function probeArgsOf(reference: string): string[] {
  return [
    "ffprobe",
    "-v",
    "error",
    "-show_entries",
    "stream=codec_type,width,height",
    "-of",
    "json",
    reference,
  ]
}

export function probeOf(printed: string): ReferenceProbe {
  let json: unknown = null
  try {
    json = JSON.parse(printed)
  } catch {
    json = null
  }
  const parsed = probed.safeParse(json)
  const streams = parsed.success ? parsed.data.streams : []
  const video = streams.find((stream) => stream.codec_type === "video")
  return {
    width: video?.width ?? null,
    height: video?.height ?? null,
    hasSound: streams.some((stream) => stream.codec_type === "audio"),
  }
}
