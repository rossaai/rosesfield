let cap: number | null = null

export function noteSpendCap(credits: number | null): void {
  cap = credits
}

export function readSpendCap(): number | null {
  return cap
}
