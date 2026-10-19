import { describe, expect, it } from "vitest"
import type { GatewaySettings } from "@/api/gateway-settings"
import { findCatalogApp } from "@/catalog/catalog-apps"
import {
  claudeCommand,
  clientConfig,
  credentialOf,
  curlExample,
  schemaPathOf,
} from "@/screens/connect/connect-code"

const origin = "https://demo.example"

const owner: GatewaySettings = {
  mode: "owner",
  engine: { target: "demo", address: null, key: "missing", origin: "demo" },
  lock: "local",
  agent: "missing",
  agentModel: null,
  retentionDays: null,
}

describe("credentialOf", () => {
  it("asks for no header on a server that listens only on this computer", () => {
    expect(credentialOf(owner)).toBe("none")
  })

  it("asks for the owner token on a locked server, and while it is unknown", () => {
    expect(credentialOf({ ...owner, lock: "token" })).toBe("token")
    expect(credentialOf(undefined)).toBe("token")
  })

  it("asks for the visitor's engine key in public mode", () => {
    expect(credentialOf({ ...owner, mode: "public", lock: "none" })).toBe(
      "engine-key"
    )
  })
})

describe("the setup code", () => {
  it("puts the visitor's engine key header in every snippet in public mode", () => {
    const image = findCatalogApp("image")
    if (image === null) {
      throw new TypeError("The catalog lacks Image")
    }
    expect(claudeCommand(origin, "engine-key")).toBe(
      `claude mcp add --transport http rosesfield ${origin}/mcp --header "X-Engine-Key: <your engine key>"`
    )
    expect(JSON.parse(clientConfig(origin, "engine-key"))).toEqual({
      mcpServers: {
        rosesfield: {
          type: "http",
          url: `${origin}/mcp`,
          headers: { "X-Engine-Key": "<your engine key>" },
        },
      },
    })
    expect(curlExample(origin, image, "none")).not.toContain('-H "X-')
    expect(curlExample(origin, image, "token")).toContain(
      '-H "Authorization: Bearer <owner token>"'
    )
    expect(schemaPathOf(image)).toBe("/api/apps/image/schema")
  })
})
