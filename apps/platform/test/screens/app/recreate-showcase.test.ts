import { QueryClient } from "@tanstack/react-query"
import { describe, expect, it } from "vitest"
import { findCatalogApp } from "@/catalog/catalog-apps"
import { defaultsOf } from "@/screens/app/app-form"
import { fillFromDraft } from "@/screens/app/form-fill"
import { recreateTargetOf } from "@/screens/explore/explore-tile"
import { showcaseRun } from "@/showcase/showcase"
import { showcaseRows } from "@/showcase/showcase-rows"

async function recreated(runId: string) {
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
  return fillFromDraft(new QueryClient(), app, defaultsOf(app), target.draft)
}

describe("Recreate on a showcase example", () => {
  it("opens Effects with that clip's effect and resolution chosen", async () => {
    const values = await recreated("cb3281e7-8764-475f-848b-8cc386311bae")
    expect(values.inputs.effect).toBe("still-in-the-street")
    expect(values.inputs.resolution).toBe("1080p")
    expect(values.aspectRatio).toBe("9:16")
  })

  it("opens Image with the example's prompt and its model", async () => {
    const values = await recreated("70b933ac-d049-47aa-a6aa-cc89f09dc456")
    expect(values.inputs.model).toBe("z-image-turbo")
    expect(String(values.inputs.prompt)).toMatch(/^A straight-on/)
    expect(values.aspectRatio).toBe("3:4")
  })
})
