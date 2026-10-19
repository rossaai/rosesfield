export type ProvenFamily = {
  provider: string
  model: string
  provedAt: string
}

export const provenFamilies: readonly ProvenFamily[] = [
  {
    provider: "luma",
    model: "luma/photon-flash-1",
    provedAt: "2026-10-19",
  },
]

export function isProvenFamily(provider: string): boolean {
  return provenFamilies.some((family) => family.provider === provider)
}
