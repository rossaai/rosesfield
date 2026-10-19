import type { AppListing, InputDefinition } from "@rosesfield/contract"
import type { FieldProblem, FieldValue } from "@/screens/app/app-form"

export type InputFieldProps<Input extends InputDefinition = InputDefinition> = {
  app: AppListing
  input: Input
  value: FieldValue
  problem: FieldProblem | undefined
  onChange: (value: FieldValue) => void
  register: (focus: () => void) => void
}

export function textOf(value: FieldValue): string {
  return typeof value === "string" ? value : ""
}

export function numberOf(value: FieldValue, fallback: number): number {
  return typeof value === "number" ? value : fallback
}

export function listOf(value: FieldValue): string[] {
  return Array.isArray(value) ? value : []
}
