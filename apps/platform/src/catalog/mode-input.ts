import type { InputDefinition } from "@rosesfield/contract"

export const modeInputName = "mode"

export function isModeInput(input: InputDefinition): boolean {
  return input.type === "choice" && input.name === modeInputName
}
