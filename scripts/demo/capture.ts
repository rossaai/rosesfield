import { mkdir } from "node:fs/promises"
import { join } from "node:path"
import { type BrowserContext, chromium } from "@playwright/test"
import { type CaptureOptions, captureOptionsOf } from "./demo-args"
import { type Proof, proofOf, reserveCredits } from "./demo-budget"
import { type CaptionFacts, hookCaption, sceneCaption } from "./demo-captions"
import { DemoHost, type HostRun, rowOf } from "./demo-host"
import { liveRunScene } from "./demo-live"
import {
  type BuiltScene,
  type LiveRun,
  liveCreditsOf,
  type Manifest,
  manifestName,
} from "./demo-manifest"
import {
  areasScene,
  creditsScene,
  graphScene,
  keyScene,
  modelListScene,
  pageScene,
  type Recorded,
  recordScene,
  recordWith,
  type SceneAct,
  shareScene,
  storedRunScene,
} from "./demo-scenes"
import { appNameOf, chooseRun, inputAssetIds, takeOf } from "./demo-takes"

type Planned = {
  host: DemoHost
  balance: number | null
  effect: HostRun
  apps: HostRun[]
  proof: Proof
  graph: string
}

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

const effectsAppId = "effects"
const screen = { width: 1920, height: 1080 }
const builtSeconds = 8.5
const welcomeScript =
  "window.localStorage.setItem('rosesfield.welcome', 'seen')"
const graphEntry = new URL(
  "../../workflows/effects-ltx-2-5/entry.json",
  import.meta.url
)
const proofRuns = new URL(
  "../../packages/catalog/src/effects/runs.json",
  import.meta.url
)

async function graphName(): Promise<string> {
  const entry = rowOf(await Bun.file(graphEntry).json())
  const { name, title } = entry
  if (typeof name !== "string" || !String(title).includes("LTX 2.5")) {
    throw new Error(
      "The Effects graph is not the LTX 2.5 graph this video names."
    )
  }
  return name
}

async function planOf(options: CaptureOptions): Promise<Planned> {
  const host = new DemoHost({ url: options.url, key: options.key })
  const mode = await host.mode()
  if (mode !== "public") {
    throw new Error(
      `${options.url} runs in ${mode} mode. The key scene needs a site in public mode, such as rosesfield.com or bun run deploy --local.`
    )
  }
  const account = await host.account()
  if (account.key !== "valid") {
    throw new Error(
      `Comfy answered ${account.key} for DEMO_KEY on ${options.url}.`
    )
  }
  if (
    options.isLive &&
    (account.credits === null || account.credits <= reserveCredits)
  ) {
    throw new Error(
      `The Comfy balance is ${account.credits ?? "unknown"} credits, and a live run keeps it at ${reserveCredits} credits or more.`
    )
  }
  const effect = await chooseRun(host, {
    appId: effectsAppId,
    runId: options.runId,
  })
  if (inputAssetIds(effect).length === 0) {
    throw new Error(
      `Run ${effect.id} keeps no input photo, and the video opens on the photo beside its result.`
    )
  }
  const apps = await Promise.all(
    options.apps.map((choice) =>
      choice.appId === effectsAppId && choice.runId === null
        ? effect
        : chooseRun(host, choice)
    )
  )
  const [proof, graph] = await Promise.all([
    Bun.file(proofRuns).json().then(proofOf),
    graphName(),
  ])
  return { host, balance: account.credits, effect, apps, proof, graph }
}

function printedPlan(options: CaptureOptions, planned: Planned): string {
  return JSON.stringify(
    {
      url: options.url,
      balance: planned.balance,
      run: planned.effect.id,
      apps: planned.apps.map((run) => ({ appId: run.appId, runId: run.id })),
      live: options.isLive,
      budget: options.budget,
      reserve: reserveCredits,
      proof: planned.proof,
      graph: planned.graph,
      out: options.out,
    },
    null,
    2
  )
}

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
  const key = await recordScene(context, folder, "key", (page, at) =>
    keyScene(page, at, options.key)
  )
  const areas = await recordScene(context, folder, "areas", areasScene)
  const models = await recordScene(context, folder, "models", (page, at) =>
    modelListScene(page, at, "/apps/image", 5)
  )
  const run = await runScene(session)
  const share = await recordWith(context, folder, "share", (page, at) =>
    shareScene(page, at, {
      runId: run.effect.id,
      makeLink: (runId) => session.planned.host.share(runId),
    })
  )
  const credits = await recordScene(context, folder, "credits", (page, at) =>
    creditsScene(page, at, run.effect.id)
  )
  return {
    recorded: [key, areas, models, run.recorded, share.recorded, credits],
    effect: run.effect,
    live: run.live,
    shareUrl: new URL(share.result.path, options.url).href,
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

async function scenesOf(
  options: CaptureOptions,
  planned: Planned
): Promise<{ tour: Tour; built: Recorded[] }> {
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
    await context.close()
    return { tour: walked, built: outro }
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
  effect: HostRun,
  folder: string
): Promise<Manifest["apps"]> {
  const takes: Manifest["apps"] = []
  for (const run of planned.apps) {
    const chosen = run.id === planned.effect.id ? effect : run
    takes.push(await takeOf(planned.host, chosen, folder))
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
    recordedAt: new Date().toISOString(),
    hook: { take: hook, caption: hookCaption(hook.appName) },
    scenes: [...walked.recorded, ...scenes.built].map((scene) => ({
      ...scene,
      caption: sceneCaption(scene.id, facts),
    })),
    shareUrl: walked.shareUrl,
    apps: await appTakes(planned, walked.effect, options.out),
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
