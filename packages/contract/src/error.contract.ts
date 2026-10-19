import { ProjectError } from "@rosesfield/kernel"
import { z } from "zod"

export const errorCode = z.string().regex(ProjectError.codePattern).max(80)

export const errorBody = z.object({
  code: errorCode,
  status: z.number().int().min(400).max(599),
})

export const errorEnvelope = z.object({
  error: errorBody,
})

export type ErrorBody = z.infer<typeof errorBody>
export type ErrorEnvelope = z.infer<typeof errorEnvelope>

export function errorEnvelopeOf(error: ProjectError): ErrorEnvelope {
  return { error: { code: error.code, status: error.status } }
}
