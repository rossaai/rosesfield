import { type Asset, asset } from "@rosesfield/contract"
import { QueryClient } from "@tanstack/react-query"
import { afterEach, describe, expect, it, vi } from "vitest"
import { assetQuery } from "@/api/queries"
import { findCatalogApp } from "@/catalog/catalog-apps"
import { defaultsOf } from "@/screens/app/app-form"
import { fillFromDraft } from "@/screens/app/form-fill"
import { recreateTargetOf } from "@/screens/explore/explore-tile"
import { mediaOf, showcaseRun } from "@/showcase/showcase"
import { showcaseRows } from "@/showcase/showcase-rows"

const uploadedId = "0b1c2d3e-4f50-4a6b-8c7d-9e0f1a2b3c99"

const uploaded: Asset = asset.parse({
  id: uploadedId,
  kind: "image",
  mime: "image/webp",
  bytes: 1_000,
  width: 864,
  height: 1152,
  durationSeconds: null,
  sourceRunId: null,
  createdAt: "2026-10-22T00:00:00.000Z",
})

afterEach(() => {
  vi.unstubAllGlobals()
})

async function recreated(
  runId: string,
  client: QueryClient = new QueryClient(),
  sent: Blob[] = []
) {
  const row = showcaseRows.find((one) => one.runId === runId)
  const app = findCatalogApp(row?.appId ?? "")
  if (row === undefined || app === null) {
    throw new Error(`no showcase row ${runId}`)
  }
  const target = recreateTargetOf({
    key: row.runId,
    run: showcaseRun(row),
    kind: row.kind,
    aspect: { width: row.width, height: row.height },
    source: { kind: "showcase", src: row.file },
  })
  if (!("draft" in target)) {
    throw new Error("a showcase example recreates from a draft")
  }
  return fillFromDraft(client, app, defaultsOf(app), target.draft, (file) => {
    sent.push(file)
    return Promise.resolve(uploaded)
  })
}

describe("Recreate on a showcase example", () => {
  it("opens Effects with that clip's effect and resolution chosen", async () => {
    const values = await recreated("cb3281e7-8764-475f-848b-8cc386311bae")
    expect(values.inputs.effect).toBe("still-in-the-street")
    expect(values.inputs.resolution).toBe("1080p")
    expect(values.aspectRatio).toBe("9:16")
  })

  it("uploads the photo the Effects clip started from into the library and sets it on the photo input", async () => {
    const asked: string[] = []
    vi.stubGlobal("fetch", (url: string) => {
      asked.push(url)
      return Promise.resolve(
        new Response(new Blob(["webp"], { type: "image/webp" }))
      )
    })
    const client = new QueryClient()
    const sent: Blob[] = []
    const values = await recreated(
      "cb3281e7-8764-475f-848b-8cc386311bae",
      client,
      sent
    )
    expect(asked).toEqual([mediaOf("street-golden-hour.webp")])
    expect(sent).toHaveLength(1)
    expect(values.inputs.image).toEqual([uploadedId])
    expect(client.getQueryData(assetQuery(uploadedId).queryKey)).toEqual({
      asset: uploaded,
    })
  })

  it("fills Relight and Remove background with their source photos, and leaves the input empty when the photo cannot be read", async () => {
    vi.stubGlobal("fetch", () =>
      Promise.resolve(new Response(new Blob(["webp"])))
    )
    const relit = await recreated("e1fffadc-7f6f-478f-8c5f-7a423a1aa106")
    expect(relit.inputs.image).toEqual([uploadedId])
    const cut = await recreated("d4958c06-57e2-40e6-8a3a-fd9278f5df6a")
    expect(cut.inputs.image).toEqual([uploadedId])
    vi.stubGlobal("fetch", () =>
      Promise.resolve(new Response(null, { status: 404 }))
    )
    const missing = await recreated("e1fffadc-7f6f-478f-8c5f-7a423a1aa106")
    expect(missing.inputs.image ?? []).toEqual([])
  })

  it("opens Image with the example's prompt and its model", async () => {
    const values = await recreated("70b933ac-d049-47aa-a6aa-cc89f09dc456")
    expect(values.inputs.model).toBe("z-image-turbo")
    expect(String(values.inputs.prompt)).toMatch(/^A straight-on/)
    expect(values.aspectRatio).toBe("3:4")
  })
})
