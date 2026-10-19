import { z } from "zod"
import { appListing } from "#app.contract"
import { asset, assetKind } from "#asset.contract"
import {
  character,
  createCharacterBody,
  updateCharacterBody,
} from "#character.contract"
import { appId, assetId, characterId, runId } from "#id.contract"
import { defineRoute } from "#route.contract"
import { run } from "#run.contract"
import { startRunBody } from "#start-run.contract"

const cursor = z.string().min(1).max(512)

export const appListResponse = z.object({ apps: z.array(appListing) })

export const runResponse = z.object({ run })

export const runPageResponse = z.object({
  runs: z.array(run),
  next: cursor.nullable(),
})

export const assetResponse = z.object({ asset })

export const assetPageResponse = z.object({
  assets: z.array(asset),
  next: cursor.nullable(),
})

export const characterResponse = z.object({ character })

export const characterListResponse = z.object({
  characters: z.array(character),
})

const appParams = z.object({ appId })
const runParams = z.object({ runId })
const assetParams = z.object({ assetId })
const characterParams = z.object({ characterId })

export const routes = {
  listApps: defineRoute({
    method: "GET",
    path: "/api/apps",
    params: null,
    query: null,
    body: null,
    response: appListResponse,
    status: 200,
  }),
  startRun: defineRoute({
    method: "POST",
    path: "/api/apps/:appId/runs",
    params: appParams,
    query: null,
    body: startRunBody,
    response: runResponse,
    status: 202,
  }),
  listRuns: defineRoute({
    method: "GET",
    path: "/api/runs",
    params: null,
    query: z.object({ appId: appId.optional(), cursor: cursor.optional() }),
    body: null,
    response: runPageResponse,
    status: 200,
  }),
  getRun: defineRoute({
    method: "GET",
    path: "/api/runs/:runId",
    params: runParams,
    query: null,
    body: null,
    response: runResponse,
    status: 200,
  }),
  cancelRun: defineRoute({
    method: "POST",
    path: "/api/runs/:runId/cancel",
    params: runParams,
    query: null,
    body: null,
    response: runResponse,
    status: 200,
  }),
  repeatRun: defineRoute({
    method: "POST",
    path: "/api/runs/:runId/repeat",
    params: runParams,
    query: null,
    body: null,
    response: runResponse,
    status: 202,
  }),
  listAssets: defineRoute({
    method: "GET",
    path: "/api/assets",
    params: null,
    query: z.object({ kind: assetKind.optional(), cursor: cursor.optional() }),
    body: null,
    response: assetPageResponse,
    status: 200,
  }),
  uploadAsset: defineRoute({
    method: "POST",
    path: "/api/assets",
    params: null,
    query: null,
    body: "bytes",
    response: assetResponse,
    status: 201,
  }),
  getAsset: defineRoute({
    method: "GET",
    path: "/api/assets/:assetId",
    params: assetParams,
    query: null,
    body: null,
    response: assetResponse,
    status: 200,
  }),
  readAssetContent: defineRoute({
    method: "GET",
    path: "/api/assets/:assetId/content",
    params: assetParams,
    query: null,
    body: null,
    response: "bytes",
    status: 200,
  }),
  deleteAsset: defineRoute({
    method: "DELETE",
    path: "/api/assets/:assetId",
    params: assetParams,
    query: null,
    body: null,
    response: null,
    status: 204,
  }),
  listCharacters: defineRoute({
    method: "GET",
    path: "/api/characters",
    params: null,
    query: null,
    body: null,
    response: characterListResponse,
    status: 200,
  }),
  createCharacter: defineRoute({
    method: "POST",
    path: "/api/characters",
    params: null,
    query: null,
    body: createCharacterBody,
    response: characterResponse,
    status: 201,
  }),
  getCharacter: defineRoute({
    method: "GET",
    path: "/api/characters/:characterId",
    params: characterParams,
    query: null,
    body: null,
    response: characterResponse,
    status: 200,
  }),
  updateCharacter: defineRoute({
    method: "PATCH",
    path: "/api/characters/:characterId",
    params: characterParams,
    query: null,
    body: updateCharacterBody,
    response: characterResponse,
    status: 200,
  }),
  deleteCharacter: defineRoute({
    method: "DELETE",
    path: "/api/characters/:characterId",
    params: characterParams,
    query: null,
    body: null,
    response: null,
    status: 204,
  }),
}
