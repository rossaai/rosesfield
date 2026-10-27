import { readFileSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { z } from "zod"
import { routerChatTable } from "#infrastructure/router-chat-models"

const source = "https://openrouter.ai/api/v1/models"
const output = fileURLToPath(
  new URL("../src/infrastructure/router-chat-models.json", import.meta.url)
)

const listed = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      pricing: z.object({
        prompt: z.string(),
        completion: z.string(),
        input_cache_read: z.string().optional(),
      }),
    })
  ),
})

function perMillionOf(perToken: string): number {
  return Math.round(Number(perToken) * 1e12) / 1e6
}

async function main(): Promise<void> {
  const response = await fetch(source, { signal: AbortSignal.timeout(30_000) })
  if (!response.ok) {
    throw new Error(`${source} answered ${response.status}`)
  }
  const { data } = listed.parse(await response.json())
  const prices = new Map(data.map((one) => [one.id, one.pricing]))
  const table = routerChatTable.parse(JSON.parse(readFileSync(output, "utf8")))
  const unlisted: string[] = []
  const models = table.models.map((model) => {
    const pricing = prices.get(model.id)
    if (pricing === undefined) {
      unlisted.push(model.id)
      return model
    }
    return {
      ...model,
      usdPer1M: {
        input: perMillionOf(pricing.prompt),
        output: perMillionOf(pricing.completion),
        cacheRead:
          pricing.input_cache_read === undefined
            ? null
            : perMillionOf(pricing.input_cache_read),
      },
    }
  })
  const readAt = new Date().toISOString().replace(/\.\d+Z$/, "Z")
  const sources = table.sources.map((one) =>
    one.url === source ? { ...one, readAt } : one
  )
  writeFileSync(
    output,
    `${JSON.stringify({ ...table, sources, models }, null, 2)}\n`
  )
  Bun.spawnSync(["bunx", "biome", "format", "--write", output])
  console.log(
    `${models.length - unlisted.length} chat models priced from ${source}`
  )
  if (unlisted.length > 0) {
    console.log(`${source} no longer lists ${unlisted.join(", ")}`)
  }
}

await main()
