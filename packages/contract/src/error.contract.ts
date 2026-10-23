import { ProjectError } from "@rosesfield/kernel"
import { z } from "zod"

export const errorCode = z.string().regex(ProjectError.codePattern).max(80)

const inputNamePattern = /^[A-Za-z][A-Za-z0-9_]{0,63}$/

const inputNamesMax = 32

export const errorBody = z.object({
  code: errorCode,
  status: z.number().int().min(400).max(599),
  inputs: z
    .array(z.string().regex(inputNamePattern))
    .max(inputNamesMax)
    .optional(),
})

export const errorEnvelope = z.object({
  error: errorBody,
})

export type ErrorBody = z.infer<typeof errorBody>
export type ErrorEnvelope = z.infer<typeof errorEnvelope>

/** Reads the input each issue names before its colon, such as mode in "mode: the value is not one of the model's choices", and never a value. */
export function inputNamesOf(issues: readonly string[]): string[] {
  const names = issues
    .map((issue) => issue.split(":")[0]?.trim() ?? "")
    .map((path) => path.replace(/^inputs\./, "").split(".")[0] ?? "")
    .filter(
      (name) =>
        inputNamePattern.test(name) && name !== "inputs" && name !== "body"
    )
  return [...new Set(names)].slice(0, inputNamesMax)
}

export function errorEnvelopeOf(error: ProjectError): ErrorEnvelope {
  const { code, status, inputs } = error
  return inputs.length === 0
    ? { error: { code, status } }
    : { error: { code, status, inputs: [...inputs] } }
}
