export const deniedProviders: readonly string[] = ["wan"]

export const deniedNames: readonly RegExp[] = [
  /(^|[/_-])wan([0-9._-]|$)/,
  /(^|[/_-])higgsfield([/_.-]|$)/i,
]

export function isDeniedModel(id: string): boolean {
  const provider = id.split("/")[0] ?? ""
  return (
    deniedProviders.includes(provider) ||
    deniedNames.some((pattern) => pattern.test(id))
  )
}
