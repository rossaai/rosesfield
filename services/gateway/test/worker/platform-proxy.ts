import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { getPlatformProxy } from "wrangler"

export type ProxyBindings = {
  DB: D1Database
  BUCKET: R2Bucket
}

export type Proxy = {
  env: ProxyBindings
  reset: () => Promise<void>
  dispose: () => Promise<void>
}

export const gatewayRoot = fileURLToPath(new URL("../..", import.meta.url))
export const testConfig = join(gatewayRoot, "test", "worker", "wrangler.jsonc")

const repositoryRoot = join(gatewayRoot, "..", "..")

const migrationFolders = [
  join(repositoryRoot, "packages", "generation", "drizzle"),
  join(repositoryRoot, "packages", "library", "drizzle"),
  join(gatewayRoot, "drizzle"),
]

function migrationStatements(): string[] {
  return migrationFolders.flatMap((folder) => {
    return readdirSync(folder)
      .filter((file) => file.endsWith(".sql"))
      .sort()
      .flatMap((file) =>
        readFileSync(join(folder, file), "utf8").split(
          "--> statement-breakpoint"
        )
      )
      .map((statement) => statement.trim())
      .filter((statement) => statement !== "")
  })
}

export async function startProxy(): Promise<Proxy> {
  const proxy = await getPlatformProxy<ProxyBindings>({
    configPath: testConfig,
    persist: false,
  })
  const { DB, BUCKET } = proxy.env
  for (const statement of migrationStatements()) {
    await DB.prepare(statement).run()
  }
  return {
    env: proxy.env,
    reset: async () => {
      await DB.batch(
        [
          "runs",
          "assets",
          "characters",
          "session_records",
          "session_limits",
        ].map((table) => DB.prepare(`delete from ${table}`))
      )
      const listed = await BUCKET.list()
      await Promise.all(
        listed.objects.map((object) => BUCKET.delete(object.key))
      )
    },
    dispose: () => proxy.dispose(),
  }
}
