export type ProvenFamily = {
  provider: string
  model: string
  provedAt: string
}

export const provenFamilies: readonly ProvenFamily[] = []

export function isProvenFamily(provider: string): boolean {
  return provenFamilies.some((family) => family.provider === provider)
}
