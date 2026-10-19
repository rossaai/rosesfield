export function readText(value: unknown): string | undefined {
  if (typeof value === "number") {
    return String(value)
  }
  return typeof value === "string" && value.trim() !== "" ? value : undefined
}

export function readOneOf<Value extends string>(
  value: unknown,
  options: readonly Value[]
): Value | undefined {
  return options.find((option) => option === value)
}

export function readSamePath(value: unknown): string | undefined {
  const text = readText(value)
  if (text === undefined || !text.startsWith("/")) {
    return undefined
  }
  try {
    const url = new URL(text, window.location.origin)
    return url.origin === window.location.origin
      ? `${url.pathname}${url.search}`
      : undefined
  } catch {
    return undefined
  }
}
