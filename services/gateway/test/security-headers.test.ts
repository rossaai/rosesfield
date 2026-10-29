import { readFileSync } from "node:fs"
import { afterEach, describe, expect, it } from "vitest"
import { headersFileOf, securityHeaders } from "#routes/security-headers"
import { type Harness, harnessFor } from "./harness"
import { localPorts } from "./local-ports"

const assetsHeadersFile = new URL(
  "../../../apps/platform/public/_headers",
  import.meta.url
)

describe("the security headers", () => {
  let harness: Harness | null = null

  afterEach(() => {
    harness?.close()
    harness = null
  })

  it.each(["/api/runs", "/api/nothing-here"])(
    "ride on every response the gateway answers, such as %s",
    async (path) => {
      harness = harnessFor({ portsFor: localPorts })
      const response = await harness.call(path)
      for (const [name, value] of Object.entries(securityHeaders)) {
        expect(response.headers.get(name)).toBe(value)
      }
    }
  )

  it("match the _headers file Cloudflare applies to the platform's static files", () => {
    expect(readFileSync(assetsHeadersFile, "utf8")).toBe(
      headersFileOf(securityHeaders)
    )
  })
})
