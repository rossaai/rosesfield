import type { AppListing, InputDefinition } from "@rosesfield/contract"
import { buildPath, routes } from "@rosesfield/contract"
import type { GatewaySettings } from "@/api/gateway-settings"

export type ConnectClient = "claude" | "chatgpt" | "other" | "api"

export type Credential = "none" | "token" | "engine-key"

export const connectClients: readonly ConnectClient[] = [
  "claude",
  "chatgpt",
  "other",
  "api",
]

export const tokenPlaceholder = "<owner token>"
export const engineKeyPlaceholder = "<your engine key>"

const schemaPath = "/api/apps/:appId/schema"

type Header = { name: string; value: string }

function headerOf(credential: Credential): Header | null {
  switch (credential) {
    case "none":
      return null
    case "token":
      return { name: "Authorization", value: `Bearer ${tokenPlaceholder}` }
    case "engine-key":
      return { name: "X-Engine-Key", value: engineKeyPlaceholder }
  }
}

export function credentialOf(
  settings: GatewaySettings | undefined
): Credential {
  if (settings?.mode === "public") {
    return "engine-key"
  }
  return settings?.lock === "local" ? "none" : "token"
}

export function schemaPathOf(app: AppListing): string {
  return buildPath(schemaPath, { appId: app.id })
}

export function mcpAddress(origin: string): string {
  return `${origin}/mcp`
}

export function apiAddress(origin: string): string {
  return `${origin}/api`
}

export function claudeCommand(origin: string, credential: Credential): string {
  const header = headerOf(credential)
  const flag =
    header === null ? "" : ` --header "${header.name}: ${header.value}"`
  return `claude mcp add --transport http rosesfield ${mcpAddress(origin)}${flag}`
}

export function clientConfig(origin: string, credential: Credential): string {
  const header = headerOf(credential)
  const server = {
    type: "http",
    url: mcpAddress(origin),
    ...(header === null ? {} : { headers: { [header.name]: header.value } }),
  }
  return JSON.stringify({ mcpServers: { rosesfield: server } }, null, 2)
}

export function runPath(app: AppListing): string {
  return buildPath(routes.startRun.path, { appId: app.id })
}

function exampleValue(
  input: InputDefinition
): string | number | string[] | null {
  switch (input.type) {
    case "prompt":
      return input.presence === "required" ? `<${input.name}>` : null
    case "image":
    case "video":
    case "audio":
    case "character":
      return input.presence === "required" ? [`<${input.type} id>`] : null
    case "choice":
    case "number":
    case "toggle":
      return input.default
    case "seed":
      return null
  }
}

export function exampleBody(app: AppListing): string {
  const inputs = Object.fromEntries(
    app.inputs.flatMap((input) => {
      const value = exampleValue(input)
      return value === null ? [] : [[input.name, value]]
    })
  )
  return JSON.stringify({ inputs })
}

export function curlExample(
  origin: string,
  app: AppListing,
  credential: Credential
): string {
  const header = headerOf(credential)
  const lines = [
    `curl -X POST ${origin}${runPath(app)}`,
    `  -H "Content-Type: application/json"`,
    ...(header === null ? [] : [`  -H "${header.name}: ${header.value}"`]),
    `  -H "Idempotency-Key: <a new key>"`,
    `  -d '${exampleBody(app)}'`,
  ]
  return lines.join(" \\\n")
}
