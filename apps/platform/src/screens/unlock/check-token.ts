import { refusalOf } from "@/api/call-route"
import { settingsPath } from "@/api/gateway-settings"

export type TokenCheck =
  | { result: "accepted" }
  | { result: "mismatch" }
  | { result: "rateLimited"; seconds: number }
  | { result: "unreachable" }

export async function checkToken(token: string): Promise<TokenCheck> {
  let response: Response
  try {
    response = await fetch(settingsPath, {
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
    })
  } catch {
    return { result: "unreachable" }
  }
  if (response.ok) {
    return { result: "accepted" }
  }
  const refusal = await refusalOf(response)
  if (refusal.status === 429) {
    return { result: "rateLimited", seconds: refusal.retryAfterSeconds ?? 0 }
  }
  if (refusal.isLock()) {
    return { result: "mismatch" }
  }
  return { result: "unreachable" }
}
