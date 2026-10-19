export type Schema = Record<string, unknown>

export function isObject(value: unknown): value is Schema {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function fieldOf(value: unknown, key: string): unknown {
  return isObject(value)
    ? Object.getOwnPropertyDescriptor(value, key)?.value
    : undefined
}

export function stringOf(value: unknown): string | null {
  return typeof value === "string" ? value : null
}

export function numberOf(value: unknown): number | null {
  const parsed = typeof value === "string" ? Number(value) : value
  return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : null
}

export function arrayOf(value: unknown): unknown[] | null {
  return Array.isArray(value) ? value : null
}
