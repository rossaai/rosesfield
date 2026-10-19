import { describe, expect, it } from "vitest"
import { readSettings } from "@/api/gateway-settings"

const ownerBody = {
  settings: {
    mode: "owner",
    engine: {
      target: "comfy-cloud",
      address: "https://cloud.comfy.org",
      key: "set",
      origin: "live",
    },
    lock: "token",
    agent: { model: "set", models: [{ provider: "minimax", id: "M3" }] },
  },
}

const publicBody = {
  settings: {
    mode: "public",
    engine: {
      target: "comfy-cloud",
      address: "https://cloud.comfy.org",
      key: "missing",
      origin: "demo",
    },
    lock: "none",
    agent: { model: "missing", models: [] },
  },
}

describe("readSettings", () => {
  it("reads the mode, the engine target, the lock and the agent's model", () => {
    expect(readSettings(ownerBody)).toEqual({
      mode: "owner",
      engine: {
        target: "comfy-cloud",
        address: "https://cloud.comfy.org",
        key: "set",
        origin: "live",
      },
      lock: "token",
      agent: "set",
      agentModel: "M3",
      retentionDays: null,
    })
  })

  it("reads the number of days a public demo keeps a session", () => {
    const body = { settings: { ...publicBody.settings, retentionDays: 7 } }
    expect(readSettings(body)).toMatchObject({ retentionDays: 7 })
    const fraction = {
      settings: { ...publicBody.settings, retentionDays: 1.5 },
    }
    expect(readSettings(fraction)).toMatchObject({ retentionDays: null })
  })

  it("reads a public deployment, which holds no lock and no key", () => {
    expect(readSettings(publicBody)).toMatchObject({
      mode: "public",
      engine: { key: "missing", origin: "demo" },
      lock: "none",
      agent: "missing",
      agentModel: null,
    })
  })

  it("keeps an engine with no address and an agent the gateway does not report", () => {
    const body = {
      settings: {
        ...ownerBody.settings,
        engine: { ...ownerBody.settings.engine, address: null },
        agent: { model: "maybe" },
      },
    }
    expect(readSettings(body)).toMatchObject({
      engine: { address: null },
      agent: "unknown",
      agentModel: null,
    })
  })

  it("refuses a body with a value the gateway never sends", () => {
    const openLock = { settings: { ...ownerBody.settings, lock: "open" } }
    const noMode = {
      settings: { ...ownerBody.settings, mode: undefined },
    }
    const otherTarget = {
      settings: {
        ...ownerBody.settings,
        engine: { ...ownerBody.settings.engine, target: "somewhere" },
      },
    }
    expect(readSettings(openLock)).toBeNull()
    expect(readSettings(noMode)).toBeNull()
    expect(readSettings(otherTarget)).toBeNull()
    expect(readSettings({ settings: null })).toBeNull()
    expect(readSettings("ok")).toBeNull()
  })
})
