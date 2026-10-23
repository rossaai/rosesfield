import { mkdir, readdir } from "node:fs/promises"
import { join, resolve } from "node:path"
import { probe } from "../checks/output-files/media-tools"
import {
  type CutPlan,
  checkPlan,
  checkTake,
  cutPlan,
  type Output,
  srtOf,
} from "./cut-commands"
import type { Step } from "./cut-filters"
import { takesFolder } from "./demo-args"
import { manifestName, manifestOf } from "./demo-manifest"

type CutOptions = {
  take: string | null
  isDraft: boolean
  isLocal: boolean
  isDryRun: boolean
}

const usage = [
  "bun run demo:cut [--take <folder>] [--local] [--draft] [--dry-run]",
  "",
  "  Cuts a take of bun run demo:capture into the video, the 9:16 clip for the post and one clip per app.",
  "  --take     the take folder, the latest under scripts/demo/takes by default",
  "  --local    cuts an owner take recorded on this machine into rosesfield-demo-local.mp4, rosesfield-clip-9x16-local.mp4 and apps/<app>-local.mp4",
  "  --draft    encodes fast at a lower quality, to check a take",
  "  --dry-run  prints the plan and each ffmpeg command, and runs none",
].join("\n")

function optionsOf(args: readonly string[]): CutOptions {
  const options: CutOptions = {
    take: null,
    isDraft: false,
    isLocal: false,
    isDryRun: false,
  }
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    const value = args[index + 1]
    if (arg === "--draft") {
      options.isDraft = true
    } else if (arg === "--local") {
      options.isLocal = true
    } else if (arg === "--dry-run") {
      options.isDryRun = true
    } else if (arg === "--take" && value !== undefined) {
      options.take = resolve(value)
      index += 1
    } else {
      throw new Error(`${arg} is not an option.\n\n${usage}`)
    }
  }
  return options
}

async function latestTake(): Promise<string> {
  const names = await readdir(takesFolder).catch(() => [])
  const latest = names.sort().at(-1)
  if (latest === undefined) {
    throw new Error(
      `No take is in ${takesFolder}. Run bun run demo:capture first.`
    )
  }
  return join(takesFolder, latest)
}

async function run(step: Step, cwd: string): Promise<void> {
  const ffmpeg = Bun.spawn(["ffmpeg", ...step.args], {
    cwd,
    stdout: "ignore",
    stderr: "pipe",
  })
  const [stderr, code] = await Promise.all([
    new Response(ffmpeg.stderr).text(),
    ffmpeg.exited,
  ])
  if (code !== 0) {
    throw new Error(`ffmpeg stopped on ${step.label}: ${stderr.trim()}`)
  }
}

async function checkOutput(output: Output, take: string): Promise<string> {
  const probed = await probe(join(take, output.file))
  const stream = probed?.streams.find((one) => one.kind === "video")
  const seconds = probed?.duration ?? null
  if (
    stream === undefined ||
    seconds === null ||
    stream.width !== output.width ||
    stream.height !== output.height ||
    seconds >= output.maxSeconds
  ) {
    throw new Error(
      `${output.file} is ${stream?.width}x${stream?.height} for ${seconds} seconds, and it must be ${output.width}x${output.height} under ${output.maxSeconds} seconds.`
    )
  }
  return `${output.file}: ${output.width}x${output.height}, ${seconds.toFixed(1)} seconds`
}

async function cut(plan: CutPlan, take: string): Promise<void> {
  await Promise.all(
    ["cut/captions", "apps"].map((folder) =>
      mkdir(join(take, folder), { recursive: true })
    )
  )
  await Promise.all([
    ...plan.captions.map((caption) =>
      Bun.write(join(take, caption.file), srtOf(caption))
    ),
    Bun.write(join(take, plan.list.file), plan.list.text),
  ])
  for (const step of plan.steps) {
    await run(step, take)
  }
  for (const output of plan.outputs) {
    console.log(await checkOutput(output, take))
  }
}

async function main(): Promise<void> {
  const options = optionsOf(Bun.argv.slice(2))
  const take = options.take ?? (await latestTake())
  const manifest = manifestOf(await Bun.file(join(take, manifestName)).json())
  checkTake(manifest, options)
  const plan = cutPlan(manifest, options)
  checkPlan(plan)
  if (options.isDryRun) {
    console.log(JSON.stringify(plan, null, 2))
    return
  }
  await cut(plan, take)
  console.log(`The video, the clip and the app clips are in ${take}.`)
}

try {
  await main()
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}
