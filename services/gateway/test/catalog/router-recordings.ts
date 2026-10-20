import { ComfyRouterGenerationEngine, type Fetch } from "@rosesfield/generation"

export const routerUrl = ComfyRouterGenerationEngine.routerUrl

const docsUrl = "https://docs.comfy.org"

export type RouterCall = { method: string; url: string; key: string | null }

type Schema = {
  model: string
  takes: string[]
  makes: string[]
  properties: Record<string, unknown>
}

export function schemaOf(schema: Schema): Record<string, unknown> {
  return {
    openapi: "3.0.2",
    "x-comfy-router-model-id": schema.model,
    "x-comfy-input-schema-authored": true,
    "x-comfy-router-input-modalities": schema.takes,
    "x-comfy-router-output-modalities": schema.makes,
    paths: {
      [`/v2/models/${schema.model}`]: {
        post: {
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: schema.properties,
                  required: ["prompt"],
                },
              },
            },
          },
          responses: { "200": { content: { "application/json": {} } } },
        },
      },
    },
  }
}

export const pictureModel = schemaOf({
  model: "maker/picture-2",
  takes: ["text", "image"],
  makes: ["image"],
  properties: {
    prompt: { type: "string" },
    aspect_ratio: { type: "string", enum: ["1:1", "16:9"], default: "1:1" },
  },
})

export const clipModel = schemaOf({
  model: "maker/clip-3",
  takes: ["text"],
  makes: ["video", "audio"],
  properties: {
    prompt: { type: "string" },
    resolution: { type: "string", enum: ["720p", "1080p"] },
    duration: { type: "integer", minimum: 5, maximum: 10 },
  },
})

export const newPictureModel = schemaOf({
  model: "studio/sketch-1",
  takes: ["text"],
  makes: ["image"],
  properties: { prompt: { type: "string" } },
})

export const wanModel = schemaOf({
  model: "wan/wan2.7-t2i",
  takes: ["text"],
  makes: ["image"],
  properties: { prompt: { type: "string" } },
})

export const hostedWanModel = schemaOf({
  model: "studio/studio-wan-3",
  takes: ["text"],
  makes: ["image"],
  properties: { prompt: { type: "string" } },
})

type FakeRouterOptions = {
  schemas: Record<string, unknown>[]
  rates?: unknown
  refuseCatalog?: string
}

export function fakeRouter(options: FakeRouterOptions): {
  fetch: Fetch
  calls: RouterCall[]
} {
  const calls: RouterCall[] = []
  const ids = options.schemas.map((one) =>
    String(one["x-comfy-router-model-id"])
  )
  const fetch: Fetch = async (input, init) => {
    const url = input instanceof Request ? input.url : input.toString()
    const method = (init?.method ?? "GET").toUpperCase()
    const headers = init?.headers
    const key =
      headers !== undefined &&
      !Array.isArray(headers) &&
      !(headers instanceof Headers)
        ? (Object.getOwnPropertyDescriptor(headers, "X-API-Key")?.value ?? null)
        : null
    calls.push({ method, url, key })
    if (url.startsWith(`${routerUrl}/v2/models?`)) {
      return options.refuseCatalog === undefined
        ? Response.json({ data: ids.map((id) => ({ id })), has_more: false })
        : Response.json(
            { detail: options.refuseCatalog, error_type: "not_enabled" },
            { status: 403, headers: { "X-Comfy-Error-Type": "not_enabled" } }
          )
    }
    if (url === `${docsUrl}/llms.txt`) {
      return new Response(
        ids.map((id) => `${docsUrl}/router-schemas/${id}.json`).join("\n")
      )
    }
    const published = options.schemas.find(
      (one) =>
        url ===
        `${docsUrl}/router-schemas/${String(one["x-comfy-router-model-id"])}.json`
    )
    if (published !== undefined) {
      return Response.json(published)
    }
    if (url.endsWith("/estimate")) {
      return Response.json(
        { detail: "not enabled", error_type: "not_enabled" },
        { status: 403, headers: { "X-Comfy-Error-Type": "not_enabled" } }
      )
    }
    const schema = options.schemas.find((one) =>
      url.endsWith(
        `/v2/models/${String(one["x-comfy-router-model-id"])}/openapi.json`
      )
    )
    if (schema !== undefined) {
      return Response.json(schema, { headers: { ETag: '"v1"' } })
    }
    if (url.includes("metronome-rates.json")) {
      return Response.json(options.rates ?? { rates: [] })
    }
    return new Response(null, { status: 404 })
  }
  return { fetch, calls }
}
