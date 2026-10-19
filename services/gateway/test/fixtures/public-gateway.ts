import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { buildPath, routes, runResponse } from "@rosesfield/contract"
import { FixedClock } from "@rosesfield/kernel"
import { composeLocalGateway, type LocalGateway } from "#compose/local-gateway"
import { readServerEnv } from "#env"
import { imageApp, sessionSecret, start } from "../sample-apps"
import { type FakeComfy, fakeComfy } from "./comfy-fetch"
import { type Seen, Visitor } from "./visitor"

export const pageHtml =
  '<!doctype html><html><head><title>Rosesfield</title></head><body><div id="root"></div></body></html>'

export type OpenedGateway = {
  gateway: LocalGateway
  comfy: FakeComfy
  clock: FixedClock
  dataDir: string
  seen: Seen[]
  visitor: (keys?: Record<string, string>) => Visitor
  close: () => Promise<void>
}

type OpenOptions = {
  settings?: Record<string, string>
  comfy?: FakeComfy
}

export function openGateway(options: OpenOptions = {}): OpenedGateway {
  const dataDir = mkdtempSync(join(tmpdir(), "rosesfield-gateway-"))
  const platformRoot = join(dataDir, "platform")
  mkdirSync(platformRoot)
  writeFileSync(join(platformRoot, "index.html"), pageHtml)
  const comfy = options.comfy ?? fakeComfy()
  const clock = new FixedClock({ now: start })
  const gateway = composeLocalGateway({
    env: readServerEnv({
      MODE: "public",
      HOST: "0.0.0.0",
      SESSION_SECRET: sessionSecret,
      DATA_DIR: dataDir,
      RETENTION_DAYS: "30",
      ...options.settings,
    }),
    apps: [imageApp()],
    clock,
    platformRoot,
    fetch: comfy.fetch,
  })
  const seen: Seen[] = []
  return {
    gateway,
    comfy,
    clock,
    dataDir,
    seen,
    visitor: (keys = {}) => new Visitor({ app: gateway.app, keys, seen }),
    close: async () => {
      await gateway.close()
      rmSync(dataDir, { recursive: true, force: true })
    },
  }
}

export async function finishedRun(visitor: Visitor, prompt: string) {
  const started = runResponse.parse(
    await (
      await visitor.call(
        buildPath(routes.startRun.path, { appId: "sample-image" }),
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ inputs: { prompt } }),
        }
      )
    ).json()
  ).run
  const path = buildPath(routes.getRun.path, { runId: started.id })
  await visitor.call(path)
  return runResponse.parse(await (await visitor.call(path)).json()).run
}
