import type { StandardSchemaWithJSON } from "@modelcontextprotocol/server"
import { type ModelForm, publishedInputOf } from "@rosesfield/catalog/comfy"
import type { AppDefinition } from "@rosesfield/contract"
import { StartRunHandler } from "@rosesfield/generation"
import { gatewayCopy } from "#copy.en"

export type StartRunArguments = {
  body: unknown
  idempotencyKey: string | null
}

const keyName = "idempotencyKey"

const keyProperty = {
  type: "string",
  minLength: 1,
  maxLength: 255,
  description: gatewayCopy.mcp.idempotencyKey,
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function splitStartRunArguments(value: unknown): StartRunArguments {
  if (!isRecord(value) || !(keyName in value)) {
    return { body: value, idempotencyKey: null }
  }
  const { [keyName]: key, ...body } = value
  return { body, idempotencyKey: typeof key === "string" ? key : null }
}

function withKey(schema: Record<string, unknown>): Record<string, unknown> {
  const properties = isRecord(schema.properties) ? schema.properties : {}
  return { ...schema, properties: { ...properties, [keyName]: keyProperty } }
}

export function startRunInputOf(
  app: AppDefinition,
  forms: readonly ModelForm[]
): StandardSchemaWithJSON<unknown> {
  const standard = publishedInputOf(app, forms)["~standard"]
  return {
    "~standard": {
      version: 1,
      vendor: "rosesfield",
      validate: async (value) => {
        const { body, idempotencyKey } = splitStartRunArguments(value)
        const key = isRecord(value) ? value[keyName] : undefined
        if (
          key !== undefined &&
          (idempotencyKey === null ||
            !StartRunHandler.keyPattern.test(idempotencyKey))
        ) {
          return {
            issues: [
              {
                message: "needs 1 to 255 printable characters",
                path: [keyName],
              },
            ],
          }
        }
        const result = await standard.validate(body)
        return result.issues === undefined
          ? { value }
          : { issues: result.issues }
      },
      jsonSchema: {
        input: (options) => withKey(standard.jsonSchema.input(options)),
        output: (options) => withKey(standard.jsonSchema.input(options)),
      },
    },
  }
}
