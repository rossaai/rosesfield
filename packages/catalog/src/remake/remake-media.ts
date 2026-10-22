import {
  type EngineFile,
  type EngineOutput,
  RunFailedError,
} from "@rosesfield/generation"
import type { PlanFrame } from "#remake/comfy/remake-plan-turn"
import { shotsOf } from "#remake/cut-finder"
import { EditRefusedError } from "#remake/edit-refused.error"
import {
  middleFramesArgsOf,
  planFrameNameOf,
  sceneScoreArgsOf,
  sceneScoresOf,
} from "#remake/ffmpeg/ffmpeg-cuts"
import { joinArgsOf } from "#remake/ffmpeg/ffmpeg-join"
import {
  probeArgsOf,
  probeOf,
  type ReferenceProbe,
} from "#remake/ffmpeg/ffmpeg-probe"
import { swapClipArgsOf } from "#remake/ffmpeg/ffmpeg-swap-clip"
import type { MediaFile, MediaTool } from "#remake/media-tool.port"
import { madeNameOf, type RemakeJob, sizeOf } from "#remake/remake-job"
import {
  checkShots,
  editSecondsOf,
  type FoundShot,
  middleFrameOf,
} from "#remake/shot-plan"

export type FoundEdit = {
  found: FoundShot[]
  probe: ReferenceProbe
}

const joinedName = "remake.mp4"

const clipName = "clip.mp4"

function outputOf(
  outputs: ReadonlyMap<string, Uint8Array>,
  name: string
): Uint8Array {
  const bytes = outputs.get(name)
  if (bytes === undefined || bytes.length === 0) {
    throw new RunFailedError({ cause: `ffmpeg wrote no ${name}` })
  }
  return bytes
}

function base64Of(bytes: Uint8Array): string {
  const chunk = 0x8000
  let text = ""
  for (let start = 0; start < bytes.length; start += chunk) {
    text += String.fromCharCode(...bytes.subarray(start, start + chunk))
  }
  return btoa(text)
}

export class RemakeMedia {
  private readonly tool: MediaTool

  constructor(tool: MediaTool) {
    this.tool = tool
  }

  limitMs(): number {
    return this.tool.limitMs()
  }

  async findShots(reference: MediaFile): Promise<FoundEdit> {
    const [scored, probed] = await Promise.all([
      this.tool.run({
        args: sceneScoreArgsOf(reference.name),
        inputs: [reference],
        outputs: [],
      }),
      this.tool.run({
        args: probeArgsOf(reference.name),
        inputs: [reference],
        outputs: [],
      }),
    ])
    const scores = sceneScoresOf(scored.stdout)
    const found = shotsOf(scores.scores, scores.frameCount)
    const problem = checkShots(found)
    if (problem !== null) {
      throw new EditRefusedError(problem)
    }
    return { found, probe: probeOf(probed.stdout) }
  }

  async framesOf(
    reference: MediaFile,
    shots: readonly FoundShot[]
  ): Promise<PlanFrame[]> {
    const names = shots.map((_, index) => planFrameNameOf(index))
    const result = await this.tool.run({
      args: middleFramesArgsOf({
        reference: reference.name,
        frames: shots.map(middleFrameOf),
      }),
      inputs: [reference],
      outputs: names,
    })
    return shots.map((shot, index) => ({
      shot,
      mime: "image/jpeg",
      base64: base64Of(outputOf(result.outputs, names[index] ?? "")),
    }))
  }

  async clipOf(
    reference: MediaFile,
    shot: FoundShot,
    shortestSeconds: number,
    assetId: EngineFile["assetId"]
  ): Promise<EngineFile> {
    const result = await this.tool.run({
      args: swapClipArgsOf({
        reference: reference.name,
        shot,
        shortestSeconds,
        output: clipName,
      }),
      inputs: [reference],
      outputs: [clipName],
    })
    return {
      assetId,
      kind: "video",
      mime: "video/mp4",
      bytes: outputOf(result.outputs, clipName),
    }
  }

  async join(job: RemakeJob): Promise<EngineOutput> {
    const made = job.works.flatMap((work) =>
      work.made === null
        ? []
        : [{ name: madeNameOf(work), bytes: work.made.bytes }]
    )
    const { width, height } = sizeOf(job)
    const result = await this.tool.run({
      args: joinArgsOf({
        reference: job.reference.name,
        shots: job.works.map((work) => ({
          shot: work.shot,
          made: work.made === null ? null : madeNameOf(work),
        })),
        width,
        height,
        sound: job.settings.keepSound && job.probe.hasSound ? "on" : "off",
        output: joinedName,
      }),
      inputs: [job.reference, ...made],
      outputs: [joinedName],
    })
    return {
      kind: "video",
      mime: "video/mp4",
      bytes: outputOf(result.outputs, joinedName),
      width,
      height,
      durationSeconds: editSecondsOf(job.found),
    }
  }
}
