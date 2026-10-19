import { run, type ShareView } from "@rosesfield/contract"
import { describe, expect, it } from "vitest"
import { afterLoad, escapeHtml, sharePage } from "#share/share-page"

const built =
  '<head><script type="module" crossorigin src="/assets/index-a1.js"></script><link rel="modulepreload" crossorigin href="/assets/b2.js"></head><body><div id="root"></div></body>'

describe("a shared output's page", () => {
  it("loads the app only after the page has painted, so the output paints first", () => {
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

describe("what the page writes as it is", () => {
  it("keeps a dollar sign in the prompt as typed", () => {
    const priced: ShareView = {
      ...view,
      run: { ...view.run, inputs: { prompt: "cost $& and $' and $$ more" } },
    }

    const page = sharePage(built, priced, "https://rosesfield.com/share/abc")

    expect(page).toContain(`"prompt":"cost $& and $' and $$ more"`)
  })

  it("names the video's own type in the link's card", () => {
    const webm: ShareView = {
      ...view,
      media: [
        {
          index: 0,
          kind: "video",
          mime: "video/webm",
          width: 640,
          height: 360,
          durationSeconds: 4,
        },
      ],
    }

    const page = sharePage(built, webm, "https://rosesfield.com/share/abc")

    expect(page).toContain(
      '<meta property="og:video:type" content="video/webm" />'
    )
  })
})
