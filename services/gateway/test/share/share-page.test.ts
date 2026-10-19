import { run } from "@rosesfield/contract"
import { describe, expect, it } from "vitest"
import type { ShareView } from "#share/share.contract"
import { afterLoad, escapeHtml, sharePage } from "#share/share-page"

const built =
  '<head><script type="module" crossorigin src="/assets/index-a1.js"></script><link rel="modulepreload" crossorigin href="/assets/b2.js"></head><body><div id="root"></div></body>'

describe("a shared result's page", () => {
  it("loads the app only after the page has painted, so the result paints first", () => {
    const page = afterLoad(built)

    expect(page).not.toContain('<script type="module" crossorigin src=')
    expect(page).not.toContain("modulepreload")
    expect(page).toContain('addEventListener("load"')
    expect(page).toContain('"/assets/index-a1.js"')
  })

  it("escapes what it writes into the page", () => {
    expect(escapeHtml('<a href="x">\'&')).toBe(
      "&lt;a href=&quot;x&quot;&gt;&#39;&amp;"
    )
  })
})

const view: ShareView = {
  id: "abc",
  path: "/share/abc",
  run: run.parse({
    id: "2c3d4e5f-6a7b-4c8d-9e0f-1a2b3c4d5e01",
    appId: "image",
    status: "done",
    inputs: { prompt: "</script><script>alert(1)</script>" },
    count: 1,
    aspectRatio: "1:1",
    seed: 1,
    outputs: [],
    progress: 1,
    engine: { adapter: "comfy-workflow", models: [], workflowHash: null },
    cost: null,
    origin: "live",
    failure: null,
    createdAt: "2026-10-19T12:00:00.000Z",
    finishedAt: "2026-10-19T12:00:05.000Z",
  }),
  media: [
    {
      index: 0,
      kind: "image",
      mime: "image/png",
      width: null,
      height: null,
      durationSeconds: null,
    },
  ],
  poster: null,
  createdAt: "2026-10-19T12:00:00.000Z",
  expiresAt: null,
}

describe("the share's data in its page", () => {
  it("rides in the page for the app, and a prompt cannot close its script", () => {
    const page = sharePage(built, view, "https://rosesfield.com/share/abc")

    expect(page).toContain(
      '<script id="rosesfield-share" type="application/json">'
    )
    expect(page).not.toContain("</script><script>alert(1)")
    expect(page).toContain("\\u003c/script>\\u003cscript>alert(1)")
  })
})
