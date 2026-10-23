import type { CaptureOptions } from "./demo-args"
import { type Proof, proofOf, reserveCredits } from "./demo-budget"
import {
  DemoHost,
  type HostAccount,
  type HostRun,
  type HostSettings,
  rowOf,
} from "./demo-host"
import type { SiteMode } from "./demo-manifest"
import { chooseRun, inputAssetIds } from "./demo-takes"

export type Planned = {
  host: DemoHost
  balance: number | null
  effect: HostRun
  apps: HostRun[]
  proof: Proof
  graph: string
}

export const effectsAppId = "effects"

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

export function checkSite(
  settings: HostSettings,
  wanted: { url: string; mode: SiteMode }
): void {
  const { url } = wanted
  if (wanted.mode === "public") {
    if (settings.mode !== "public") {
      throw new Error(
        `${url} runs in ${settings.mode} mode. The key scene needs a site in public mode, such as rosesfield.com or bun run deploy --local. A server in owner mode that holds the Comfy key records with --owner.`
      )
    }
    return
  }
  if (settings.mode !== "owner") {
    throw new Error(
      `${url} runs in ${settings.mode} mode, and --owner records a server in owner mode. Record it without --owner.`
    )
  }
  if (settings.lock !== "local") {
    throw new Error(
      `${url} locks its owner routes with ${settings.lock}, and the capture holds no owner token. Record a server on this machine with the local lock.`
    )
  }
  if (settings.keyFrom !== "server" || settings.engineKey !== "set") {
    throw new Error(
      `${url} holds no Comfy key on its server, and an owner take types no key. Start the server with its Comfy key.`
    )
  }
}

export function checkAccount(
  account: HostAccount,
  wanted: { url: string; mode: SiteMode; isLive: boolean }
): void {
  if (account.key !== "valid") {
    const whose = wanted.mode === "owner" ? "the server's key" : "DEMO_KEY"
    throw new Error(
      `Comfy answered ${account.key} for ${whose} on ${wanted.url}.`
    )
  }
  if (
    wanted.isLive &&
    (account.credits === null || account.credits <= reserveCredits)
  ) {
    throw new Error(
      `The Comfy balance is ${account.credits ?? "unknown"} credits, and a live run keeps it at ${reserveCredits} credits or more.`
    )
  }
}

async function effectOf(
  host: DemoHost,
  options: CaptureOptions
): Promise<HostRun> {
  const effect = await chooseRun(host, {
    appId: effectsAppId,
    runId: options.runId,
  })
  if (inputAssetIds(effect).length === 0) {
    throw new Error(
      `Run ${effect.id} keeps no input photo, and the video opens on the photo beside its result.`
    )
  }
  return effect
}

export async function planOf(options: CaptureOptions): Promise<Planned> {
  const host = new DemoHost({ url: options.url, key: options.key })
  checkSite(await host.settings(), options)
  const account = await host.account()
  checkAccount(account, options)
  const effect = await effectOf(host, options)
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

export function printedPlan(options: CaptureOptions, planned: Planned): string {
  return JSON.stringify(
    {
      url: options.url,
      mode: options.mode,
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
