import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { defaultChatModel, routerChat } from "@rosesfield/agent"
import { errorEnvelope, routes } from "@rosesfield/contract"
import { afterAll, describe, expect, it } from "vitest"
import { composeLocalGateway } from "#compose/local-gateway"
import { readServerEnv, readWorkerEnv } from "#env"
import { gatewayRoutes } from "#gateway.contract"
import { audioApp, imageApp, ownerToken } from "./sample-apps"

const folders: string[] = []

afterAll(() => {
  for (const folder of folders) {
    rmSync(folder, { recursive: true, force: true })
  }
})

function folder(): string {
  const made = mkdtempSync(join(tmpdir(), "rosesfield-lock-"))
  folders.push(made)
  return made
}

function publicGateway() {
  const dataDir = folder()
  const platformRoot = folder()
  writeFileSync(
    join(platformRoot, "index.html"),
    "<!doctype html><title>R</title>"
  )
  const env = readServerEnv({
    HOST: "0.0.0.0",
    OWNER_TOKEN: ownerToken,
    DATA_DIR: dataDir,
  })
  return composeLocalGateway({
    env,
    apps: [imageApp(), audioApp()],
    platformRoot,
  })
}

async function codeOf(response: Response): Promise<string> {
  return errorEnvelope.parse(await response.json()).error.code
}

describe("the server settings", () => {
  it("refuse to start a server that listens beyond 127.0.0.1 without an owner token", () => {
    expect(() => readServerEnv({ HOST: "0.0.0.0" })).toThrow(/OWNER_TOKEN/)
    expect(() => readServerEnv({ HOST: "0.0.0.0", OWNER_TOKEN: " " })).toThrow(
      /OWNER_TOKEN is missing/
    )
  })

  it("refuse an owner token shorter than 32 characters", () => {
    expect(() =>
      readServerEnv({ HOST: "0.0.0.0", OWNER_TOKEN: "short" })
    ).toThrow(/OWNER_TOKEN needs at least 32 characters/)
  })

  it("refuse a Cloudflare deployment without an owner token", () => {
    expect(() => readWorkerEnv({ COMFY_API_KEY: "key" })).toThrow(
      /OWNER_TOKEN is missing/
    )
  })

  it("leave the token optional on 127.0.0.1 and fill the defaults", () => {
    expect(readServerEnv({})).toEqual({
      engine: { target: "demo" },
      access: { mode: "owner", lock: { mode: "local" } },
      agent: null,
      host: "127.0.0.1",
      port: 8787,
      dataDir: "./data",
    })
    expect(
      readServerEnv({ COMFY_API_KEY: "key", PORT: "9000" }).engine
    ).toEqual({
      target: "comfy-cloud",
      baseUrl: "https://cloud.comfy.org",
      apiKey: "key",
    })
  })
})

describe("the owner lock on a server that listens beyond 127.0.0.1", () => {
  const gateway = publicGateway()
  afterAll(() => gateway.jobs.stop())

  it("refuses an API request, an MCP request and an unknown API path without the token", async () => {
    for (const { path, method } of [
      { path: routes.listApps.path, method: "GET" },
      {
        path: routes.startRun.path.replace(":appId", "sample-image"),
        method: "POST",
      },
      { path: "/mcp", method: "POST" },
      { path: "/api/nothing-here", method: "GET" },
    ]) {
      const response = await gateway.app.request(path, { method })
      expect(response.status, `${method} ${path}`).toBe(401)
      expect(response.headers.get("www-authenticate")).toContain("Bearer")
      expect(await codeOf(response)).toBe("OWNER_TOKEN_MISSING")
    }
    const runs = await gateway.handlers.listRuns.execute({
      appId: null,
      cursor: null,
    })
    expect(runs.runs).toEqual([])
  })

  it("refuses a token that does not match", async () => {
    const response = await gateway.app.request(routes.listApps.path, {
      headers: { authorization: `Bearer ${ownerToken.replace("d", "e")}` },
    })
    expect(response.status).toBe(401)
    expect(await codeOf(response)).toBe("OWNER_TOKEN_MISMATCH")
  })

  it("lets a request with the token through", async () => {
    const response = await gateway.app.request(gatewayRoutes.getSettings.path, {
      headers: { authorization: `Bearer ${ownerToken}` },
    })
    expect(response.status).toBe(200)
    const text = await response.text()
    expect(JSON.parse(text)).toEqual({
      settings: {
        mode: "owner",
        engine: {
          target: "demo",
          address: null,
          key: "missing",
          origin: "demo",
        },
        lock: "token",
        agent: { model: "missing", models: [] },
      },
    })
  })

  it("serves the platform's files without the token, so Unlock can load", async () => {
    const response = await gateway.app.request("/history")
    expect(response.status).toBe(200)
    expect(await response.text()).toContain("<!doctype html>")
  })
})

describe("the owner lock on a server that listens on 127.0.0.1 only", () => {
  const gateway = composeLocalGateway({
    env: readServerEnv({ DATA_DIR: folder(), COMFY_API_KEY: "comfy-secret" }),
    apps: [imageApp()],
    platformRoot: null,
  })
  afterAll(() => gateway.jobs.stop())
  const path = gatewayRoutes.getSettings.path

  it("lets a request from this computer through without a token", async () => {
    const response = await gateway.app.request(path, {
      headers: { host: "127.0.0.1:8787", origin: "http://localhost:5173" },
    })
    expect(response.status).toBe(200)
    const text = await response.text()
    expect(text).not.toContain("comfy-secret")
    expect(JSON.parse(text)).toEqual({
      settings: {
        mode: "owner",
        engine: {
          target: "comfy-cloud",
          address: "https://cloud.comfy.org",
          key: "set",
          origin: "live",
        },
        lock: "local",
        agent: {
          model: "set",
          models: [{ provider: routerChat.provider, id: defaultChatModel }],
        },
      },
    })
  })

  it("refuses a request whose Host is another name, as a rebound DNS name sends", async () => {
    const response = await gateway.app.request(path, {
      headers: { host: "rebind.example:8787" },
    })
    expect(response.status).toBe(403)
    expect(await codeOf(response)).toBe("HOST_REFUSED")
  })

  it("refuses a request a page on another origin sends", async () => {
    const response = await gateway.app.request("/mcp", {
      method: "POST",
      headers: { host: "127.0.0.1:8787", origin: "https://pages.example" },
    })
    expect(response.status).toBe(403)
    expect(await codeOf(response)).toBe("ORIGIN_REFUSED")
  })
})
