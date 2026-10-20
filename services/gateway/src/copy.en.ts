import type { AssetKind } from "@rosesfield/contract"
import type { EngineTarget } from "#engine/engine-target"

const outputWords: Record<AssetKind, string> = {
  image: "images",
  video: "video",
  audio: "audio",
  text: "text",
}

const targetWords: Record<EngineTarget, string> = {
  "comfy-cloud": "Comfy Cloud",
  "comfy-deployment": "a Comfy deployment",
  comfyui: "your ComfyUI through comfy-api-proxy",
  "runpod-pod": "a ComfyUI in a RunPod pod",
  modal: "a ComfyUI in a Modal Server",
  "runpod-serverless": "RunPod Serverless",
  demo: "the demo engine",
}

const plural = new Intl.PluralRules("en")

export const gatewayCopy = {
  mcp: {
    instructions:
      "Each app tool starts one run of a Rosesfield app on this server and returns the run at once. The run keeps working on the server. Read it with read_run until its status is done, failed or cancelled. Each output is an asset, and read_run gives the address of its bytes. list_assets and list_characters read the library. Pass the same idempotencyKey when you send a start again, so it starts no second run.",
    toolDescription: (appId: string, kind: AssetKind): string =>
      `Starts a run of the ${appId} app, which makes ${outputWords[kind]}. The reply holds the run with its id and its status. Pass idempotencyKey to make a retry start no second run.`,
    idempotencyKey:
      "A key you choose for this start. A second start with the same key returns the first run.",
    readRun:
      "Reads one run by its id: its status, its progress from 0 to 1, and its outputs with the address of each one's bytes.",
    listAssets:
      "Lists the assets in the library, newest first, 60 at a time, each with the address of its bytes. Pass kind to keep one kind. Pass the reply's next as cursor to read the next page.",
    catalogUnread:
      "The model catalog could not be read, so the app tools are not offered. Check the engine key in Settings and try again.",
    listCharacters:
      "Lists the characters, newest first, each with its name, its reference asset ids and its notes.",
  },
  server: {
    listening: (url: string): string => `Rosesfield listens on ${url}`,
    engineDemo:
      "Runs use the demo engine, because no engine target is set. Its outputs are flat test files, not model output.",
    engineLive: (target: EngineTarget): string =>
      `Runs use ${targetWords[target]}.`,
    enginePublic: (target: EngineTarget): string =>
      `Runs use ${targetWords[target]} with the key each visitor sends, and the demo engine without one.`,
    lockLocal:
      "The server answers only on this computer, so it asks for no owner token.",
    lockToken:
      "The server asks for the owner token on every API and MCP request.",
    publicMode: (days: number): string =>
      `Public mode: each visitor's Comfy key opens their own work, and their runs, assets, characters and conversations are deleted ${days} ${plural.select(days) === "one" ? "day" : "days"} after their last visit.`,
    agentOn: (model: string): string => `The agent answers with ${model}.`,
    agentOff:
      "The agent is off, because no agent model is set. Set AGENT_BASE_URL and AGENT_MODEL.",
    resumed: (count: number): string =>
      plural.select(count) === "one"
        ? `${count} unfinished run is watched again.`
        : `${count} unfinished runs are watched again.`,
    purged: (count: number): string =>
      plural.select(count) === "one"
        ? `${count} expired record was deleted.`
        : `${count} expired records were deleted.`,
  },
}
