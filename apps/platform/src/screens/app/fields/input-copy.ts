import type { AppListing, InputDefinition } from "@rosesfield/contract"
import { hasCatalogText, t, tCatalog } from "@/copy/t"

function optionalText(key: string): string | null {
  return hasCatalogText(key) ? tCatalog(key) : null
}

function inputText(
  app: AppListing,
  input: InputDefinition,
  part: string
): string | null {
  const family = input.labelKey.split(".")[0] ?? app.id
  return (
    optionalText(`${app.id}.input.${input.name}.${part}`) ??
    optionalText(`${family}.input.${input.name}.${part}`)
  )
}

export function inputCaption(input: InputDefinition): string {
  return tCatalog(input.labelKey)
}

export function inputPlaceholder(
  app: AppListing,
  input: InputDefinition
): string | null {
  return inputText(app, input, "placeholder")
}

export function promptPlaceholderOf(
  app: AppListing | null,
  input: InputDefinition | null
): string {
  return (
    (app === null || input === null ? null : inputPlaceholder(app, input)) ??
    t("home.prompt.placeholder")
  )
}

export function inputNote(
  app: AppListing,
  input: InputDefinition
): string | null {
  return inputText(app, input, "note")
}

export function inputUnit(app: AppListing, input: InputDefinition): string {
  return inputText(app, input, "unit") ?? ""
}

export function isOptionalInput(input: InputDefinition): boolean {
  return "presence" in input && input.presence === "optional"
}
