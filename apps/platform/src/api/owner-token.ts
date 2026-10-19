import { KeptValues } from "@/api/kept-values"

const kept = new KeptValues({ database: "rosesfield", store: "owner" })
const tokenKey = "token"

let current: string | null = null

export function readOwnerToken(): string | null {
  return current
}

export async function loadOwnerToken(): Promise<void> {
  current = await kept.read(tokenKey)
}

export async function keepOwnerToken(token: string): Promise<void> {
  current = token
  await kept.write(tokenKey, token)
}

export async function forgetOwnerToken(): Promise<void> {
  current = null
  await kept.remove(tokenKey)
}
