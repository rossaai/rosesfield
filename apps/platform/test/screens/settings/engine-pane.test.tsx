import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import type { GatewaySettings } from "@/api/gateway-settings"
import { t } from "@/copy/t"
import type { Account } from "@/screens/settings/account-query"
import { EnginePane } from "@/screens/settings/engine-pane"
import { renderAt } from "../../shell/shell-router"

afterEach(cleanup)

const localDemo: GatewaySettings = {
  mode: "owner",
  engine: { target: "demo", address: null, key: "missing", origin: "demo" },
  lock: "local",
  keyFrom: "settings",
  agent: "missing",
  agentModel: null,
  place: "bun",
  retentionDays: null,
}

const noKey: Account = {
  key: "missing",
  credits: null,
  retentionDays: null,
  cap: null,
}

describe("the engine pane", () => {
  it("offers to paste your key on a server on your machine with no setting", async () => {
    renderAt("/", () => <EnginePane />, {
      settings: localDemo,
      account: noKey,
    })

    expect(
      await screen.findByRole("button", { name: t("key.add") })
    ).toBeTruthy()
    expect(screen.queryByText(t("settings.engine.howTo"))).toBeNull()
  })

  it("says where to set the key on a server that holds its own", async () => {
    renderAt("/", () => <EnginePane />, {
      settings: { ...localDemo, keyFrom: "server" },
      account: noKey,
    })

    expect(await screen.findByText(t("settings.engine.howTo"))).toBeTruthy()
    expect(screen.queryByRole("button", { name: t("key.add") })).toBeNull()
  })
})
