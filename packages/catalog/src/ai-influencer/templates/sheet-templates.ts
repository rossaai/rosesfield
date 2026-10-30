import {
  type SheetTemplate,
  sheetTemplates,
} from "#ai-influencer/templates/sheet-template.contract"
import {
  anyValue,
  camelOf,
  slotNamesOf,
  traitInputNames,
  traitSections,
} from "#ai-influencer/traits"
import { AppDefinitionInvalidError } from "#app-definition-invalid.error"
import records from "./templates.json"

const folder = "ai-influencer"

const offeredBySlot: ReadonlyMap<string, readonly string[]> = new Map(
  traitSections.flatMap((section) =>
    slotNamesOf(section).map((name): [string, readonly string[]] => [
      name,
      section.values,
    ])
  )
)

function traitFailures(template: SheetTemplate): string[] {
  return Object.entries(template.traits).flatMap(([name, value]) => {
    const offered = offeredBySlot.get(name)
    if (offered === undefined) {
      return [`${name} is no trait of the app`]
    }
    return offered.includes(value) && value !== anyValue
      ? []
      : [`${name} offers no ${value}`]
  })
}

function invalid(reason: string): AppDefinitionInvalidError {
  return new AppDefinitionInvalidError({ folder, reason })
}

/** Reads the templates the Library shows, and refuses one whose traits the app does not offer. */
export function readTemplates(source: unknown): SheetTemplate[] {
  const parsed = sheetTemplates.safeParse(source)
  if (!parsed.success) {
    throw invalid(
      `the templates are invalid: ${parsed.error.issues
        .map((issue) => `${issue.path.join(".")} ${issue.message}`)
        .join(", ")}`
    )
  }
  for (const template of parsed.data) {
    const failures = traitFailures(template)
    if (failures.length > 0) {
      throw invalid(`the template ${template.id} ${failures.join(", ")}`)
    }
  }
  return parsed.data
}

export const templates: readonly SheetTemplate[] = readTemplates(records)

export function findTemplate(
  id: string | undefined,
  from: readonly SheetTemplate[] = templates
): SheetTemplate | null {
  return from.find((template) => template.id === id) ?? null
}

/** Every trait input a template sets: its own picks, and any in every other. */
export function templateInputsOf(
  template: SheetTemplate
): Record<string, string> {
  return Object.fromEntries(
    traitInputNames.map((name) => [name, template.traits[name] ?? anyValue])
  )
}

/** The copy key of a template's name. */
export function templateNameKeyOf(id: string): string {
  return `aiInfluencer.template.${camelOf(id)}.name`
}

export type {
  SheetPreview,
  SheetTemplate,
} from "#ai-influencer/templates/sheet-template.contract"
