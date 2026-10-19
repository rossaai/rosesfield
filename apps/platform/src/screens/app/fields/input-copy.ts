import type { AppListing, InputDefinition } from "@rosesfield/contract"
import { hasCatalogText, tCatalog } from "@/copy/t"

function optionalText(key: string): string | null {
  return hasCatalogText(key) ? tCatalog(key) : null
}

export function inputCaption(input: InputDefinition): string {
  return tCatalog(input.labelKey)
}

export function inputPlaceholder(
  app: AppListing,
  input: InputDefinition
): string | null {
  return optionalText(`${app.id}.input.${input.name}.placeholder`)
}

export function inputNote(
  app: AppListing,
  input: InputDefinition
): string | null {
  return optionalText(`${app.id}.input.${input.name}.note`)
}

export function inputUnit(app: AppListing, input: InputDefinition): string {
  return optionalText(`${app.id}.input.${input.name}.unit`) ?? ""
}

export function isOptionalInput(input: InputDefinition): boolean {
  return "presence" in input && input.presence === "optional"
}
