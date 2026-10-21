export type MediaFile = {
  name: string
  bytes: Uint8Array
}

export type MediaRun = {
  args: readonly string[]
  inputs: readonly MediaFile[]
  outputs: readonly string[]
}

export type MediaResult = {
  stdout: string
  outputs: ReadonlyMap<string, Uint8Array>
}

export abstract class MediaTool {
  /** Runs one ffmpeg or ffprobe command in a folder of its own that holds the inputs, and reads the outputs it names. */
  abstract run(run: MediaRun): Promise<MediaResult>

  /** Says the longest time one command can take before the tool ends it. */
  abstract limitMs(): number
}
