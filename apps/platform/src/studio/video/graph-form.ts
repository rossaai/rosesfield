import type { ModelField } from "@rosesfield/catalog/comfy"
import type { AppListing } from "@rosesfield/contract"

type AppInput = AppListing["inputs"][number]

export function fieldOfInput(input: AppInput): ModelField | null {
  const base = {
    name: input.name,
    path: input.name,
    required: "presence" in input && input.presence === "required",
  }
  switch (input.type) {
    case "choice":
      return {
        ...base,
        kind: "choice",
        options: input.options.map((option) => option.value),
        default: input.default,
      }
    case "number":
      return {
        ...base,
        kind: "number",
        min: input.min,
        max: input.max,
        integer: Number.isInteger(input.step),
        step: input.step,
        default: input.default,
      }
    case "image":
      return { ...base, kind: "media", media: "image", min: 0, max: input.max }
    default:
      return null
  }
}

export function graphFormOf(app: AppListing): ModelField[] {
  return app.inputs.flatMap((input) => {
    const field = fieldOfInput(input)
    return field === null ? [] : [field]
  })
}
