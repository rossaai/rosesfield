import type { ShareView } from "@rosesfield/contract"
import { describe, expect, it } from "vitest"
import { afterLoad, escapeHtml, sharePage } from "#share/share-page"
import { sharedRun } from "./shared-run"

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
  run: sharedRun,
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
    const page = sharePage(built, { view, poster: null }, "https://rosesfield.com/share/abc")

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

    const page = sharePage(built, { view: priced, poster: null }, "https://rosesfield.com/share/abc")

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

    const page = sharePage(built, { view: webm, poster: null }, "https://rosesfield.com/share/abc")

    expect(page).toContain(
      '<meta property="og:video:type" content="video/webm" />'
    )
  })
})

describe("a shared video's card", () => {
  const clip: ShareView = {
    ...view,
    media: [
      {
        index: 0,
        kind: "video",
        mime: "video/mp4",
        width: 1080,
        height: 1920,
        durationSeconds: 5,
      },
    ],
  }

  it("shows its poster as the image, at the poster's own size", () => {
    const page = sharePage(
      built,
      { view: clip, poster: "/share/abc/media/0/poster" },
      "https://rosesfield.com/share/abc"
    )

    expect(page).toContain(
      '<meta property="og:image" content="https://rosesfield.com/share/abc/media/0/poster" />'
    )
    expect(page).toContain('<meta property="og:image:width" content="720" />')
    expect(page).toContain('<meta property="og:image:height" content="1280" />')
    expect(page).toContain('<meta property="og:video:width" content="1080" />')
    expect(page).toContain(
      '<meta name="twitter:card" content="summary_large_image" />'
    )
    expect(page).toContain(
      '<link rel="preload" as="image" href="https://rosesfield.com/share/abc/media/0/poster" fetchpriority="high" />'
    )
  })

  it("names no image when the video has no poster", () => {
    const page = sharePage(
      built,
      { view: clip, poster: null },
      "https://rosesfield.com/share/abc"
    )

    expect(page).not.toContain("og:image")
    expect(page).not.toContain(" poster=")
    expect(page).toContain('<meta name="twitter:card" content="summary" />')
  })
})
