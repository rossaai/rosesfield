import type { TextContent, TSchema } from "@earendil-works/pi-ai"
import { z } from "zod"

export function toolParameters(schema: z.ZodType): TSchema {
  const json = z.toJSONSchema(schema, { io: "input" })
  return Object.fromEntries(
    Object.entries(json).filter(([key]) => key !== "$schema")
  )
}

export function jsonOutput(value: unknown): TextContent[] {
  return [{ type: "text", text: JSON.stringify(value) }]
}
