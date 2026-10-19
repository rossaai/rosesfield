import { RouterHttp } from "#infrastructure/router/router-http"
import type { Recording } from "../replay-fetch"

export const routerUrl = RouterHttp.routerUrl
export const ratesUrl = RouterHttp.ratesUrl
export const docsUrl = RouterHttp.docsUrl

export const pictureModel = "maker/picture-2"
export const requestId = "6f1a1a6e-6a53-4a5f-9d3a-2b3b0a1f9c21"
export const outputUrl = "https://files.maker.test/out/picture.png"

type SchemaOptions = {
  model: string
  takes: string[]
  makes: string[]
  properties: Record<string, unknown>
  required?: string[]
  answers?: string
  aliasOf?: string
}

export function routerSchema(options: SchemaOptions): Record<string, unknown> {
  return {
    openapi: "3.0.2",
    info: { title: options.model, version: "1" },
    "x-comfy-router-model-id": options.model,
    "x-comfy-input-schema-authored": true,
    "x-comfy-output-schema-authored": true,
    "x-comfy-router-input-modalities": options.takes,
    "x-comfy-router-output-modalities": options.makes,
    ...(options.aliasOf === undefined
      ? {}
      : { "x-comfy-router-alias-of": options.aliasOf }),
    paths: {
      [`/v2/models/${options.model}`]: {
        post: {
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  additionalProperties: false,
                  properties: options.properties,
                  required: options.required ?? [],
                },
              },
            },
          },
          responses: {
            "200": {
              content: { [options.answers ?? "application/json"]: {} },
            },
          },
        },
      },
    },
    components: { schemas: {} },
  }
}

export const pictureSchema = routerSchema({
  model: pictureModel,
  takes: ["text", "image"],
  makes: ["image"],
  required: ["prompt"],
  properties: {
    prompt: { type: "string", description: "What to draw." },
    aspect_ratio: { type: "string", enum: ["1:1", "16:9"], default: "1:1" },
    images: {
      description: "Reference images, each an http(s) URL or a base64 string.",
      anyOf: [
        { type: "string" },
        { type: "array", items: { type: "string" }, maxItems: 10 },
      ],
    },
    raw: { type: "boolean", default: false },
    seed: { type: "integer", minimum: 0, maximum: 4294967295 },
    webhook_url: { type: "string" },
    route_hint: {
      type: "string",
      description: "Comfy Router supplies this value itself.",
    },
    model: {
      type: "string",
      description:
        "Comfy Router supplies this from the path, so omit it there.",
    },
  },
})

export function catalogPage(ids: readonly string[]): Recording {
  return {
    method: "GET",
    url: `${routerUrl}/v2/models?limit=100`,
    status: 200,
    json: {
      data: ids.map((id) => ({
        id,
        provider: id.split("/")[0],
        model: id.split("/")[1],
        billing: { charges_on_policy_rejection: "yes" },
      })),
      has_more: false,
      next_cursor: null,
    },
  }
}

export function schemaRead(
  model: string,
  document: unknown,
  etag = '"v1"'
): Recording {
  return {
    method: "GET",
    url: `${routerUrl}/v2/models/${model}/openapi.json`,
    status: 200,
    headers: { ETag: etag },
    json: document,
  }
}

export function schemaSame(model: string): Recording {
  return {
    method: "GET",
    url: `${routerUrl}/v2/models/${model}/openapi.json`,
    status: 304,
  }
}

export function submitted(model = pictureModel): Recording {
  return {
    method: "POST",
    url: `${routerUrl}/v2/models/${model}/requests`,
    status: 201,
    json: { request_id: requestId, status: "IN_QUEUE", queue_position: 0 },
  }
}

export function refused(
  method: "POST" | "GET",
  path: string,
  status: number,
  errorType: string,
  detail: string
): Recording {
  return {
    method,
    url: `${routerUrl}${path}`,
    status,
    headers: { "X-Comfy-Error-Type": errorType },
    json: { detail, error_type: errorType },
  }
}

export function queueStatus(
  status: "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED",
  errorType?: string
): Recording {
  return {
    method: "GET",
    url: `${routerUrl}/v2/models/${pictureModel}/requests/${requestId}/status`,
    status: 200,
    headers: { "Retry-After": "3" },
    json: {
      request_id: requestId,
      status,
      ...(errorType === undefined ? {} : { error_type: errorType }),
    },
  }
}

export function result(credits = "14"): Recording {
  return {
    method: "GET",
    url: `${routerUrl}/v2/models/${pictureModel}/requests/${requestId}`,
    status: 200,
    headers: { "X-Comfy-Credits-Used": credits },
    json: { id: "task-1", status: "Ready", result: { sample: outputUrl } },
  }
}

export function outputFile(bytes: Uint8Array): Recording {
  return {
    method: "GET",
    url: outputUrl,
    status: 200,
    headers: { "Content-Type": "image/png" },
    bytes,
  }
}

export function cancelled(): Recording {
  return {
    method: "PUT",
    url: `${routerUrl}/v2/models/${pictureModel}/requests/${requestId}/cancel`,
    status: 409,
    json: { status: "ALREADY_COMPLETED" },
  }
}
