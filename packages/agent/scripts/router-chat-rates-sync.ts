import { writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { z } from "zod"
import { routerChatModels } from "#infrastructure/router-chat-models"

const source = "https://openrouter.ai/api/v1/models"
const output = fileURLToPath(
  new URL("../src/infrastructure/router-chat-rates.gen.ts", import.meta.url)
)

const listed = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      pricing: z.object({ prompt: z.string(), completion: z.string() }),
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
  const models: Record<string, { input: number; output: number }> = {}
  for (const model of routerChatModels) {
    const found = data.find((one) => one.id === model)
    if (found === undefined) {
      throw new Error(`${source} lists no ${model}`)
    }
    models[model] = {
      input: perMillionOf(found.pricing.prompt),
      output: perMillionOf(found.pricing.completion),
    }
  }
  const table = {
    source,
    readOn: new Date().toISOString().slice(0, 10),
    unit: "USD per 1M tokens",
    models,
  }
  writeFileSync(
    output,
    `// Written by packages/agent/scripts/router-chat-rates-sync.ts from the prices OpenRouter publishes. Do not edit.\n\nexport const routerChatRates = ${JSON.stringify(table, null, 2)} as const\n`
  )
  console.log(`${Object.keys(models).length} chat models priced from ${source}`)
}

await main()
