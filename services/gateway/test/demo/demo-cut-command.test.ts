import { mkdir, mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

const command = fileURLToPath(
  new URL("../../../../scripts/demo/cut.ts", import.meta.url)
)

const shareUrl = "https://rosesfield.com/share/Zq3Ftb8mVwq1J0aXrN4u2A"
const sceneOrder = [
  "key",
  "areas",
  "models",
  "run",
  "share",
  "credits",
  "router",
  "cloud",
  "catalog",
  "graph",
  "proof",
]

const take = {
  appId: "effects",
  appName: "Effects",
  runId: "2d8e5b6a-3f4c-4e7d-9a0b-9c8d7e6f5a4b",
  input: { file: "media/photo.png", kind: "image" },
  output: { file: "media/result.mp4", kind: "video" },
  credits: 37.9,
}

const scenes = sceneOrder.map((id) => ({
  id,
  file: "screens/scene.webm",
  windows: [{ start: 0.5, end: 3 }],
  caption: id === "graph" ? "Effects runs one LTX 2.5 graph, effects-ltx-2-5, on Comfy Cloud." : `The ${id} scene.`,
}))

function manifest(changes: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    url: "https://rosesfield.com",
    recordedAt: "2026-10-22T12:00:00.000Z",
    hook: { take, caption: "Your photo, then the video one Effects run made from it." },
    scenes,
    shareUrl,
    apps: [take],
    credits: { budget: 200, live: [], proofRuns: 12, proofCredits: 455.2 },
    ...changes,
  }
}

async function ffmpeg(cwd: string, args: string[]): Promise<void> {
  const done = Bun.spawn(["ffmpeg", "-y", "-v", "error", ...args], { cwd })
  expect(await done.exited).toBe(0)
}

async function probe(file: string): Promise<{ width: number; height: number; seconds: number }> {
  const done = Bun.spawn(
    ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height:format=duration", "-of", "json", file],
    { stdout: "pipe" }
  )
  const body = JSON.parse(await new Response(done.stdout).text())
  return {
    width: body.streams[0].width,
    height: body.streams[0].height,
    seconds: Number(body.format.duration),
  }
}

async function cut(folder: string, ...args: string[]): Promise<{ code: number; out: string; error: string }> {
  const done = Bun.spawn(["bun", command, "--take", folder, ...args], {
    stdout: "pipe",
    stderr: "pipe",
  })
  const [out, error, code] = await Promise.all([
    new Response(done.stdout).text(),
    new Response(done.stderr).text(),
    done.exited,
  ])
  return { code, out, error }
}

async function writeTake(folder: string, body: Record<string, unknown>): Promise<void> {
  await Bun.write(join(folder, "manifest.json"), JSON.stringify(body))
}

let folder = ""

beforeAll(async () => {
  folder = await mkdtemp(join(tmpdir(), "rosesfield-demo-take-"))
  await mkdir(join(folder, "screens"))
  await mkdir(join(folder, "media"))
  await Promise.all([
    ffmpeg(folder, ["-f", "lavfi", "-i", "testsrc=size=640x360:rate=30", "-t", "3", "-c:v", "libvpx", "-b:v", "200k", "screens/scene.webm"]),
    ffmpeg(folder, ["-f", "lavfi", "-i", "color=c=0x884422:size=480x640", "-frames:v", "1", "media/photo.png"]),
    ffmpeg(folder, ["-f", "lavfi", "-i", "testsrc2=size=480x640:rate=30", "-t", "2", "-c:v", "libx264", "-pix_fmt", "yuv420p", "media/result.mp4"]),
  ])
  await writeTake(folder, manifest())
}, 60_000)

afterAll(async () => {
  await rm(folder, { recursive: true, force: true })
})

type Plan = {
  steps: { label: string; args: string[] }[]
  captions: { file: string; text: string; seconds: number }[]
  seconds: { video: number; built: number; vertical: number }
}

describe("bun run demo:cut", () => {
  it("plans a video under 2 minutes that opens on the photo beside its result and ends on 40 seconds of how it was built", async () => {
    const done = await cut(folder, "--dry-run")

    expect(done.error).toBe("")
    const plan: Plan = JSON.parse(done.out)
    expect(plan.seconds.video).toBeLessThan(120)
    expect(plan.seconds.built).toBe(40)
    const [hook] = plan.steps
    expect(hook?.label).toBe("00-hook")
    expect(hook?.args.indexOf("media/photo.png")).toBeLessThan(hook?.args.indexOf("media/result.mp4") ?? -1)
    expect(hook?.args.join(" ")).toContain("hstack=inputs=2")
    expect(hook?.args.join(" ")).toContain("-t 10.000")
    const segments = plan.steps.filter((step) => /^\d\d-/.test(step.label))
    expect(segments.slice(-5).map((step) => step.label.split("-")[1])).toEqual(["router", "cloud", "catalog", "graph", "proof"])
    expect(segments.every((step) => step.args.join(" ").includes("subtitles=cut/captions/"))).toBe(true)
    expect(plan.captions.map((caption) => caption.text)).toContain("Effects runs one LTX 2.5 graph, effects-ltx-2-5, on Comfy Cloud.")
  })

  it("plans a 9:16 clip under 30 seconds that holds the effect and the share link, and one clip per app", async () => {
    const plan: Plan = JSON.parse((await cut(folder, "--dry-run")).out)

    expect(plan.seconds.vertical).toBeLessThan(30)
    const vertical = plan.steps.find((step) => step.label === "vertical")
    expect(vertical?.args.join(" ")).toContain("1080:1920")
    expect(vertical?.args).toContain("media/result.mp4")
    expect(plan.captions.find((caption) => caption.file.endsWith("vertical.srt"))?.text).toContain(shareUrl)
    expect(plan.steps.filter((step) => step.label.startsWith("app-")).map((step) => step.label)).toEqual(["app-effects"])
  })

  it("cuts the take into a 1080p video under 2 minutes, a 1080 by 1920 clip under 30 seconds and an app clip", async () => {
    const done = await cut(folder, "--draft")

    expect(done.error).toBe("")
    expect(done.code).toBe(0)
    const [video, vertical, app] = await Promise.all([
      probe(join(folder, "rosesfield-demo.mp4")),
      probe(join(folder, "rosesfield-clip-9x16.mp4")),
      probe(join(folder, "apps/effects.mp4")),
    ])
    expect(video).toMatchObject({ width: 1920, height: 1080 })
    expect(video.seconds).toBeGreaterThan(64)
    expect(video.seconds).toBeLessThan(120)
    expect(vertical).toMatchObject({ width: 1080, height: 1920 })
    expect(vertical.seconds).toBeLessThan(30)
    expect(app).toMatchObject({ width: 1280, height: 720 })
  }, 120_000)

  it("cuts the final video only from a take recorded on rosesfield.com, and a local take only as a draft", async () => {
    const local = await mkdtemp(join(tmpdir(), "rosesfield-demo-take-"))
    await writeTake(local, manifest({ url: "http://127.0.0.1:8788" }))

    const [final, draft] = await Promise.all([cut(local, "--dry-run"), cut(local, "--dry-run", "--draft")])
    await rm(local, { recursive: true })

    expect(final.code).toBe(1)
    expect(final.error).toContain("recorded on http://127.0.0.1:8788")
    expect(draft.code).toBe(0)
  })

  it("refuses a take with no share link or with a scene missing, so no video goes out without them", async () => {
    const noLink = await mkdtemp(join(tmpdir(), "rosesfield-demo-take-"))
    const noScene = await mkdtemp(join(tmpdir(), "rosesfield-demo-take-"))
    await writeTake(noLink, manifest({ shareUrl: null }))
    await writeTake(noScene, manifest({ scenes: scenes.slice(0, -1) }))

    const [link, scene] = await Promise.all([cut(noLink, "--dry-run"), cut(noScene, "--dry-run")])
    await Promise.all([rm(noLink, { recursive: true }), rm(noScene, { recursive: true })])

    expect(link.code).toBe(1)
    expect(link.error).toContain("no share link")
    expect(scene.code).toBe(1)
    expect(scene.error).toContain("no proof scene")
  })
})
