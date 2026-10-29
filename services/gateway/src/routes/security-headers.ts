import type { MiddlewareHandler } from "hono"

export const securityHeaders: Readonly<Record<string, string>> = {
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
}

export function headersFileOf(
  headers: Readonly<Record<string, string>>
): string {
  const lines = Object.entries(headers).map(
    ([name, value]) => `  ${name}: ${value}`
  )
  return ["/*", ...lines, ""].join("\n")
}

export const withSecurityHeaders: MiddlewareHandler = async (c, next) => {
  await next()
  const missing = Object.entries(securityHeaders).filter(
    ([name]) => !c.res.headers.has(name)
  )
  if (missing.length === 0) {
    return
  }
  c.res = new Response(c.res.body, c.res)
  for (const [name, value] of missing) {
    c.res.headers.set(name, value)
  }
}
