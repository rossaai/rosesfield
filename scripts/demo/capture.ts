import { mkdir } from "node:fs/promises"
import { join } from "node:path"
import { type BrowserContext, chromium } from "@playwright/test"
import { type CaptureOptions, captureOptionsOf } from "./demo-args"
import { type CaptionFacts, hookCaption, sceneCaption } from "./demo-captions"
import type { HostRun } from "./demo-host"
import { liveRunScene } from "./demo-live"
import {
  type BuiltScene,
  type LiveRun,
  liveCreditsOf,
  type Manifest,
  manifestName,
} from "./demo-manifest"
import { effectsAppId, type Planned, planOf, printedPlan } from "./demo-plan"
import {
  appScreenScene,
  areasScene,
  creditsScene,
  graphScene,
  keyScene,
  modelListScene,
  pageScene,
  type Recorded,
  recordPage,
  recordScene,
  recordWith,
  type SceneAct,
  shareScene,
  storedRunScene,
} from "./demo-scenes"
import { type AppSeen, appNameOf, takeOf } from "./demo-takes"

type Session = {
  context: BrowserContext
  options: CaptureOptions
  planned: Planned
}

type Tour = {
  recorded: Recorded[]
  effect: HostRun
  live: LiveRun[]
  shareUrl: string
}

const screen = { width: 1920, height: 1080 }
const builtSeconds = 8.5
const welcomeScript =
  "window.localStorage.setItem('rosesfield.welcome', 'seen')"

async function runScene(
  session: Session
): Promise<{ recorded: Recorded; effect: HostRun; live: LiveRun[] }> {
  const { context, options, planned } = session
  const { effect } = planned
  if (!options.isLive) {
    const recorded = await recordScene(
      context,
      options.out,
      "run",
      (page, at) => storedRunScene(page, at, effect.id)
    )
    return { recorded, effect, live: [] }
  }
  const { recorded, result } = await recordWith(
    context,
    options.out,
    "run",
    (page, at) =>
      liveRunScene(page, at, {
        host: planned.host,
        from: effect,
        left: options.budget,
      })
  )
  const live = [{ runId: result.run.id, credits: result.credits }]
  return { recorded, effect: result.run, live }
}

async function tour(session: Session): Promise<Tour> {
  const { context, options } = session
  const folder = options.out
  const { key } = options
  const keyed =
    key === null
      ? []
      : [
          await recordScene(context, folder, "key", (page, at) =>
            keyScene(page, at, key)
          ),
        ]
  const areas = await recordScene(context, folder, "areas", areasScene)
  const models = await recordScene(context, folder, "models", (page, at) =>
    modelListScene(page, at, "/apps/image", 5)
  )
  const run = await runScene(session)
  const share = await recordWith(context, folder, "share", (page, at) =>
    shareScene(page, at, { runId: run.effect.id, site: options.url })
  )
  const credits = await recordScene(context, folder, "credits", (page, at) =>
    creditsScene(page, at, run.effect.id)
  )
  return {
    recorded: [...keyed, areas, models, run.recorded, share.recorded, credits],
    effect: run.effect,
    live: run.live,
    shareUrl: share.result.url,
  }
}

function builtActs(graph: string, runId: string): [BuiltScene, SceneAct][] {
  return [
    [
      "router",
      (page, at) => modelListScene(page, at, "/apps/video", builtSeconds - 2.5),
    ],
    ["cloud", (page, at) => pageScene(page, at, "/settings", builtSeconds)],
    ["catalog", (page, at) => pageScene(page, at, "/apps", builtSeconds)],
    [
      "graph",
      (page, at) =>
        graphScene(page, at, { runId, graph, seconds: builtSeconds }),
    ],
    ["proof", (page, at) => pageScene(page, at, "/history", builtSeconds)],
  ]
}

async function built(session: Session, runId: string): Promise<Recorded[]> {
  const recorded: Recorded[] = []
  for (const [id, act] of builtActs(session.planned.graph, runId)) {
    recorded.push(
      await recordScene(session.context, session.options.out, id, act)
    )
  }
  return recorded
}

function chosenApps(planned: Planned, effect: HostRun): HostRun[] {
  return planned.apps.map((run) =>
    run.id === planned.effect.id ? effect : run
  )
}

async function appScreens(
  session: Session,
  runs: readonly HostRun[]
): Promise<Map<string, AppSeen>> {
  const seen = new Map<string, AppSeen>()
  for (const run of runs) {
    const { file, result } = await recordPage(
      session.context,
      session.options.out,
      `app-${run.appId}-${run.id.slice(0, 8)}`,
      (page, at) => appScreenScene(page, at, run)
    )
    seen.set(run.id, {
      model: result.model,
      screen: { file, windows: result.windows },
    })
  }
  return seen
}

type Scenes = { tour: Tour; built: Recorded[]; apps: Map<string, AppSeen> }

async function scenesOf(
  options: CaptureOptions,
  planned: Planned
): Promise<Scenes> {
  const browser = await chromium.launch({ headless: true })
  try {
    const context = await browser.newContext({
      baseURL: options.url,
      viewport: screen,
      deviceScaleFactor: 1,
      recordVideo: { dir: join(options.out, "raw"), size: screen },
    })
    await context.addInitScript({ content: welcomeScript })
    const session = { context, options, planned }
    const walked = await tour(session)
    const outro = await built(session, walked.effect.id)
    const apps = await appScreens(session, chosenApps(planned, walked.effect))
    await context.close()
    return { tour: walked, built: outro, apps }
  } finally {
    await browser.close()
  }
}

function factsOf(
  options: CaptureOptions,
  planned: Planned,
  walked: Tour,
  balance: number | null
): CaptionFacts {
  return {
    appName: appNameOf(effectsAppId),
    isLive: options.isLive,
    runCredits: walked.effect.credits,
    balance,
    liveRuns: walked.live.length,
    liveCredits: walked.live.reduce((sum, run) => sum + run.credits, 0),
    proofRuns: planned.proof.runs,
    proofCredits: planned.proof.credits,
    graph: planned.graph,
  }
}

async function appTakes(
  planned: Planned,
  scenes: Scenes,
  folder: string
): Promise<Manifest["apps"]> {
  const takes: Manifest["apps"] = []
  for (const run of chosenApps(planned, scenes.tour.effect)) {
    takes.push(await takeOf(planned.host, run, folder, scenes.apps.get(run.id)))
  }
  return takes
}

async function record(
  options: CaptureOptions,
  planned: Planned
): Promise<Manifest> {
  await mkdir(join(options.out, "screens"), { recursive: true })
  const scenes = await scenesOf(options, planned)
  const walked = scenes.tour
  const [hook, account] = await Promise.all([
    takeOf(planned.host, walked.effect, options.out),
    planned.host.account(),
  ])
  if (hook.input === null) {
    throw new Error(`Run ${walked.effect.id} keeps no input photo to show.`)
  }
  const facts = factsOf(options, planned, walked, account.credits)
  return {
    url: options.url,
    mode: options.mode,
    recordedAt: new Date().toISOString(),
    hook: { take: hook, caption: hookCaption(hook.appName) },
    scenes: [...walked.recorded, ...scenes.built].map((scene) => ({
      ...scene,
      caption: sceneCaption(scene.id, facts),
    })),
    shareUrl: walked.shareUrl,
    apps: await appTakes(planned, scenes, options.out),
    credits: {
      budget: options.budget,
      live: walked.live,
      proofRuns: planned.proof.runs,
      proofCredits: planned.proof.credits,
    },
  }
}

async function main(options: CaptureOptions): Promise<number> {
  const planned = await planOf(options)
  if (options.isPlanOnly) {
    console.log(printedPlan(options, planned))
    return 0
  }
  const manifest = await record(options, planned)
  await Bun.write(
    join(options.out, manifestName),
    `${JSON.stringify(manifest, null, 2)}\n`
  )
  const spent = liveCreditsOf(manifest.credits)
  console.log(
    `The take is in ${options.out}. Its live runs spent ${spent} of ${options.budget} credits. Cut it with bun run demo:cut --take ${options.out}`
  )
  if (spent > options.budget) {
    console.error(`The live runs spent more than ${options.budget} credits.`)
    return 1
  }
  return 0
}

function messageOf(error: unknown, key: string | null): string {
  const message = error instanceof Error ? error.message : String(error)
  return key === null ? message : message.replaceAll(key, "<your key>")
}

let key: string | null = null
try {
  const options = captureOptionsOf(Bun.argv.slice(2), process.env, new Date())
  key = options.key
  process.exit(await main(options))
} catch (error) {
  console.error(messageOf(error, key))
  process.exit(1)
}
