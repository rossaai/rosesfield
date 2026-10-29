import {
  type AssetId,
  assetIdFormat,
  characterIdFormat,
} from "@rosesfield/kernel"
import { QueryClient } from "@tanstack/react-query"
import { afterEach, describe, expect, it, vi } from "vitest"
import { characterQuery } from "@/api/queries"
import { findCatalogApp } from "@/catalog/catalog-apps"
import { defaultsOf } from "@/screens/app/app-form"
import { placeAll } from "@/screens/app/form-fill"

const characterId = characterIdFormat.parse(
  "3e4f5061-7283-4d9e-8f0a-2b3c4d5e6f70"
)
const firstPhoto = assetIdFormat.parse("5061728a-9b4c-4d5e-8f7a-8b9c0d1e2f3a")
const secondPhoto = assetIdFormat.parse("61728a9b-0c5d-4e6f-9a8b-9c0d1e2f3a4b")

function clientWith(references: AssetId[]): QueryClient {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Number.POSITIVE_INFINITY },
    },
  })
  client.setQueryData(characterQuery(characterId).queryKey, {
    character: {
      id: characterId,
      name: "Mara",
      references,
      notes: "",
      createdAt: "2026-10-21T09:00:00.000Z",
    },
  })
  return client
}

function motion() {
  const app = findCatalogApp("motion")
  if (app === null) {
    throw new Error("no app motion")
  }
  return app
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("Use in, then Motion, for a character", () => {
  it("fills Motion's photo with the character's first photo", async () => {
    vi.stubGlobal("fetch", () => Promise.reject(new Error("offline")))
    const app = motion()
    const placed = await placeAll(
      clientWith([firstPhoto, secondPhoto]),
      app,
      defaultsOf(app),
      [characterId]
    )
    expect(placed.inputs.photo).toEqual([firstPhoto])
    expect(placed.inputs.clip).toEqual([])
    expect(placed.inputs.endKey ?? []).toEqual([])
  })

  it("leaves the photo empty for a character with no photo, the control", async () => {
    vi.stubGlobal("fetch", () => Promise.reject(new Error("offline")))
    const app = motion()
    const placed = await placeAll(clientWith([]), app, defaultsOf(app), [
      characterId,
    ])
    expect(placed.inputs.photo ?? []).toEqual([])
  })
})
