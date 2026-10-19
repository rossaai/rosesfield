import { listApps } from "@rosesfield/catalog"
import { UploadAssetHandler } from "@rosesfield/library"
import { composeLocalGateway, type LocalGateway } from "#compose/local-gateway"
import { gatewayCopy } from "#copy.en"
import { readServerEnv, type ServerEnv } from "#env"

const purgeEveryMs = 3_600_000

function describe(env: ServerEnv): string[] {
  const copy = gatewayCopy.server
  const lines: string[] = []
  if (env.access.mode === "public") {
    lines.push(copy.publicMode(env.access.retentionDays))
    lines.push(copy.enginePublic(env.engine.target))
  } else {
    lines.push(
      env.engine.target === "demo"
        ? copy.engineDemo
        : copy.engineLive(env.engine.target)
    )
    lines.push(
      env.access.lock.mode === "local" ? copy.lockLocal : copy.lockToken
    )
  }
  lines.push(env.agent === null ? copy.agentOff : copy.agentOn(env.agent.model))
  return lines
}

async function purge(gateway: LocalGateway): Promise<void> {
  const count = await gateway.purge()
  const total =
    count.runs + count.assets + count.characters + count.conversations
  if (total > 0) {
    console.log(gatewayCopy.server.purged(total))
  }
}

async function serve(): Promise<void> {
  const env = readServerEnv(Bun.env)
  const gateway = composeLocalGateway({
    env,
    apps: listApps(),
    warmCatalog: true,
  })
  const server = Bun.serve({
    hostname: env.host,
    port: env.port,
    maxRequestBodySize: UploadAssetHandler.maxBytes,
    idleTimeout: 60,
    fetch: gateway.app.fetch,
  })
  console.log(gatewayCopy.server.listening(server.url.href))
  for (const line of describe(env)) {
    console.log(line)
  }
  if (env.access.mode === "public") {
    await purge(gateway)
    setInterval(() => {
      purge(gateway).catch((error: unknown) => console.error(error))
    }, purgeEveryMs)
    return
  }
  const resumed = await gateway.jobs.resume()
  if (resumed > 0) {
    console.log(gatewayCopy.server.resumed(resumed))
  }
}

try {
  await serve()
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}
