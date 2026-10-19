import { describe, expect, it } from "vitest"
import { afterLoad, escapeHtml } from "#share/share-page"

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
