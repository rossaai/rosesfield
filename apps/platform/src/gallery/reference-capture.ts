const captures = import.meta.glob<string>("./reference/*.png", {
  query: "?url",
  import: "default",
  eager: true,
})

export function captureOf(unit: string, state: string): string | undefined {
  return captures[`./reference/${unit}-${state}.png`]
}

export function captureName(unit: string, state: string): string {
  return `${unit}-${state}.png`
}
