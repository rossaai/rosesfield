import { keepOwnerToken } from "@/api/owner-token"

const tokenPattern = /^#token=([\x21-\x7e]{32,1024})$/

export function tokenOfHash(hash: string): string | null {
  const token = tokenPattern.exec(hash)?.[1]
  if (token === undefined) {
    return null
  }
  try {
    return decodeURIComponent(token)
  } catch {
    return null
  }
}

export async function keepTokenFromLink(): Promise<void> {
  const token = tokenOfHash(window.location.hash)
  if (token === null) {
    return
  }
  await keepOwnerToken(token)
  window.history.replaceState(
    window.history.state,
    "",
    `${window.location.pathname}${window.location.search}`
  )
}
