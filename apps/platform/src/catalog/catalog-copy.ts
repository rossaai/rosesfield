const modules = import.meta.glob<Record<string, unknown>>(
  "../../../../packages/catalog/src/*/copy.en.ts",
  { eager: true }
)

function isTextRecord(value: unknown): value is Record<string, string> {
  return (
    typeof value === "object" &&
    value !== null &&
    Object.values(value).every((entry) => typeof entry === "string")
  )
}

function readCatalogCopy(): Readonly<Record<string, string>> {
  const merged: Record<string, string> = {}
  for (const module of Object.values(modules)) {
    for (const value of Object.values(module)) {
      if (isTextRecord(value)) {
        Object.assign(merged, value)
      }
    }
  }
  return merged
}

export const catalogCopy: Readonly<Record<string, string>> = readCatalogCopy()
