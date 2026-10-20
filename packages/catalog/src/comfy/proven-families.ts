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
  { provider: "bfl", model: "bfl/flux-3-image", provedAt: "2026-10-19" },
  {
    provider: "openai",
    model: "openai/gpt-image-2.5-flare",
    provedAt: "2026-10-19",
  },
  {
    provider: "krea",
    model: "krea/krea-2-medium-turbo",
    provedAt: "2026-10-19",
  },
  { provider: "xai", model: "xai/grok-imagine-image", provedAt: "2026-10-19" },
  { provider: "kling", model: "kling/kling-image-o1", provedAt: "2026-10-19" },
]

export function isProvenFamily(provider: string): boolean {
  return provenFamilies.some((family) => family.provider === provider)
}
