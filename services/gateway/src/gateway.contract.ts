import { appId, defineRoute, keyCheck, runOrigin } from "@rosesfield/contract"
import { z } from "zod"
import { engineTarget } from "#engine/engine-target"

export const engineSettings = z.object({
  target: engineTarget,
  address: z.string().nullable(),
  key: z.enum(["set", "missing"]),
  origin: runOrigin,
})

export const settingsResponse = z.object({
  settings: z.object({
    mode: z.enum(["owner", "public"]),
    engine: engineSettings,
    lock: z.enum(["local", "token", "none"]),
    agent: z.object({
      model: z.enum(["set", "missing"]),
      models: z.array(z.object({ provider: z.string(), id: z.string() })),
    }),
  }),
})

export const engineSettingsResponse = z.object({
  engine: engineSettings,
  targets: z.array(
    z.object({ target: engineTarget, settings: z.array(z.string()) })
  ),
})

export const keyCheckResponse = z.object({
  checks: z.array(
    z.object({
      engine: z.string(),
      target: engineTarget,
      origin: runOrigin,
      check: keyCheck,
    })
  ),
})

export const appSchemaResponse = z.record(z.string(), z.unknown())

export const healthResponse = z.object({ status: z.literal("ok") })

export type Settings = z.infer<typeof settingsResponse>["settings"]
export type EngineStatus = z.infer<typeof engineSettings>

export const gatewayRoutes = {
  getSettings: defineRoute({
    method: "GET",
    path: "/api/settings",
    params: null,
    query: null,
    body: null,
    response: settingsResponse,
    status: 200,
  }),
  getEngineSettings: defineRoute({
    method: "GET",
    path: "/api/settings/engine",
    params: null,
    query: null,
    body: null,
    response: engineSettingsResponse,
    status: 200,
  }),
  checkEngineKey: defineRoute({
    method: "POST",
    path: "/api/settings/engine/check",
    params: null,
    query: null,
    body: null,
    response: keyCheckResponse,
    status: 200,
  }),
  getAppSchema: defineRoute({
    method: "GET",
    path: "/api/apps/:appId/schema",
    params: z.object({ appId }),
    query: null,
    body: null,
    response: appSchemaResponse,
    status: 200,
  }),
  getHealth: defineRoute({
    method: "GET",
    path: "/api/health",
    params: null,
    query: null,
    body: null,
    response: healthResponse,
    status: 200,
  }),
}
