import type { ModelField } from "@rosesfield/catalog/comfy"
import type { AppListing } from "@rosesfield/contract"
import { t, tCatalog } from "@/copy/t"
import type { FieldProblem } from "@/screens/app/app-form"
import { inputCaption } from "@/screens/app/fields/input-copy"
import { fieldCaption } from "@/screens/app/hosted/hosted-fields"

const promptName = "prompt"

const missingKeys: readonly string[] = [
  "field.prompt.required",
  "field.asset.required",
  "field.choice.required",
  "field.number.required",
]

function captionOf(
  name: string,
  app: AppListing,
  fields: readonly ModelField[] | null
): string | null {
  const field = fields?.find((one) => one.name === name)
  if (field !== undefined) {
    return fieldCaption(field)
  }
  const input = app.inputs.find((one) => one.name === name)
  return input === undefined ? null : inputCaption(input)
}

export function barMessageOf(
  problems: ReadonlyMap<string, FieldProblem>,
  app: AppListing,
  fields: readonly ModelField[] | null
): string | null {
  const [first] = problems.values()
  if (first === undefined) {
    return null
  }
  if (first.name === promptName) {
    return t(first.key, first.values)
  }
  const words = t(first.key, first.values)
  const caption = captionOf(first.name, app, fields)
  if (caption === null) {
    return words
  }
  return missingKeys.includes(first.key)
    ? tCatalog("image.bar.pick", { field: caption.toLowerCase() })
    : tCatalog("image.bar.problem", { field: caption, problem: words })
}
