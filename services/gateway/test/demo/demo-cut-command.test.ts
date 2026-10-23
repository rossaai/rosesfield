import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import {
  cut,
  localUrl,
  makeMedia,
  manifest,
  ownerManifest,
  probe,
  scenes,
  shareUrl,
  writeTake,
} from "./demo-take"

let folder = ""
let ownerFolder = ""

beforeAll(async () => {
  folder = await mkdtemp(join(tmpdir(), "rosesfield-demo-take-"))
  ownerFolder = await mkdtemp(join(tmpdir(), "rosesfield-demo-owner-"))
  await Promise.all([makeMedia(folder), makeMedia(ownerFolder)])
  await Promise.all([
    writeTake(folder, manifest()),
    writeTake(ownerFolder, ownerManifest()),
  ])
}, 60_000)

afterAll(async () => {
  await Promise.all([
    rm(folder, { recursive: true, force: true }),
    rm(ownerFolder, { recursive: true, force: true }),
  ])
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
    expect(hook?.args.indexOf("media/photo.png")).toBeLessThan(
      hook?.args.indexOf("media/result.mp4") ?? -1
    )
    expect(hook?.args.join(" ")).toContain("hstack=inputs=2")
    expect(hook?.args.join(" ")).toContain("-t 10.000")
    const segments = plan.steps.filter((step) => /^\d\d-/.test(step.label))
    expect(segments.slice(-5).map((step) => step.label.split("-")[1])).toEqual([
      "router",
      "cloud",
      "catalog",
      "graph",
      "proof",
    ])
    expect(
      segments.every((step) =>
        step.args.join(" ").includes("subtitles=cut/captions/")
      )
    ).toBe(true)
    expect(plan.captions.map((caption) => caption.text)).toContain(
      "Effects runs one LTX 2.5 graph, effects-ltx-2-5, on Comfy Cloud."
    )
  })

  it("plans a 9:16 clip under 30 seconds that holds the effect and the share link, and one clip per app", async () => {
    const plan: Plan = JSON.parse((await cut(folder, "--dry-run")).out)

    expect(plan.seconds.vertical).toBeLessThan(30)
    const vertical = plan.steps.find((step) => step.label === "vertical")
    expect(vertical?.args.join(" ")).toContain("1080:1920")
    expect(vertical?.args).toContain("media/result.mp4")
    expect(
      plan.captions.find((caption) => caption.file.endsWith("vertical.srt"))
        ?.text
    ).toContain(shareUrl)
    expect(
      plan.steps
        .filter((step) => step.label.startsWith("app-"))
        .map((step) => step.label)
    ).toEqual(["app-effects"])
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

    const [final, draft] = await Promise.all([
      cut(local, "--dry-run"),
      cut(local, "--dry-run", "--draft"),
    ])
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

    const [link, scene] = await Promise.all([
      cut(noLink, "--dry-run"),
      cut(noScene, "--dry-run"),
    ])
    await Promise.all([
      rm(noLink, { recursive: true }),
      rm(noScene, { recursive: true }),
    ])

    expect(link.code).toBe(1)
    expect(link.error).toContain("no share link")
    expect(scene.code).toBe(1)
    expect(scene.error).toContain("no proof scene")
  })
})

describe("bun run demo:cut --local", () => {
  it("plans an owner take with no key scene, local names, the repository link and an app clip of the app's screen and result", async () => {
    const done = await cut(ownerFolder, "--local", "--dry-run")

    expect(done.error).toBe("")
    const plan: Plan & { outputs: { file: string }[] } = JSON.parse(done.out)
    const segments = plan.steps.filter((step) => /^\d\d-/.test(step.label))
    expect(segments.map((step) => step.label.split("-")[1])).not.toContain(
      "key"
    )
    expect(segments[1]?.label).toBe("01-areas-0")
    expect(plan.seconds.video).toBeLessThan(120)
    expect(plan.seconds.built).toBe(40)
    expect(plan.outputs.map((output) => output.file)).toEqual([
      "rosesfield-demo-local.mp4",
      "rosesfield-clip-9x16-local.mp4",
      "apps/effects-local.mp4",
    ])
    const vertical = plan.captions.find((one) =>
      one.file.endsWith("vertical.srt")
    )
    expect(vertical?.text).toContain("https://github.com/rossaai/rosesfield")
    expect(vertical?.text).not.toContain(localUrl)
    const app = plan.steps.find((step) => step.label === "app-effects")
    expect(app?.args).toContain("screens/scene.webm")
    expect(app?.args.join(" ")).toContain("concat=n=2")
    expect(
      plan.captions.find((one) => one.file.endsWith("app-effects.srt"))?.text
    ).toBe("Effects on Rosesfield, Flux 2 Pro, 37.9 credits")
  })

  it("refuses a public take and an owner take recorded off this machine", async () => {
    const elsewhere = await mkdtemp(join(tmpdir(), "rosesfield-demo-take-"))
    await writeTake(elsewhere, ownerManifest({ url: "https://rosesfield.com" }))

    const [publicTake, offMachine, unflagged] = await Promise.all([
      cut(folder, "--local", "--dry-run"),
      cut(elsewhere, "--local", "--dry-run"),
      cut(ownerFolder, "--dry-run"),
    ])
    await rm(elsewhere, { recursive: true })

    expect(publicTake.code).toBe(1)
    expect(publicTake.error).toContain(
      "in public mode on https://rosesfield.com"
    )
    expect(offMachine.code).toBe(1)
    expect(offMachine.error).toContain("--local cuts an owner take")
    expect(unflagged.code).toBe(1)
    expect(unflagged.error).toContain("with --local")
  })

  it("cuts the owner take into local files at 1080p, 1080 by 1920 and an app clip of 6 to 10 seconds", async () => {
    const done = await cut(ownerFolder, "--local", "--draft")

    expect(done.error).toBe("")
    expect(done.code).toBe(0)
    const [video, vertical, app] = await Promise.all([
      probe(join(ownerFolder, "rosesfield-demo-local.mp4")),
      probe(join(ownerFolder, "rosesfield-clip-9x16-local.mp4")),
      probe(join(ownerFolder, "apps/effects-local.mp4")),
    ])
    expect(video).toMatchObject({ width: 1920, height: 1080 })
    expect(video.seconds).toBeLessThan(120)
    expect(vertical).toMatchObject({ width: 1080, height: 1920 })
    expect(vertical.seconds).toBeLessThan(30)
    expect(app).toMatchObject({ width: 1280, height: 720 })
    expect(app.seconds).toBeGreaterThanOrEqual(6)
    expect(app.seconds).toBeLessThanOrEqual(10)
    expect(
      await Bun.file(join(ownerFolder, "rosesfield-demo.mp4")).exists()
    ).toBe(false)
  }, 120_000)
})
