import { describe, expect, it } from "vitest"
import type { HostSettings } from "../../../../scripts/demo/demo-host"
import { checkSite } from "../../../../scripts/demo/demo-plan"
import { shareLinkOf } from "../../../../scripts/demo/demo-scenes"

const ownerSite: HostSettings = {
  mode: "owner",
  lock: "local",
  keyFrom: "server",
  engineKey: "set",
}

describe("checkSite for an owner take", () => {
  const wanted = { url: "http://127.0.0.1:8788", mode: "owner" as const }

  it("records an owner server on the local lock that holds its Comfy key", () => {
    expect(() => checkSite(ownerSite, wanted)).not.toThrow()
  })

  it("refuses an owner server that holds no key on the server", () => {
    expect(() =>
      checkSite({ ...ownerSite, keyFrom: "settings" }, wanted)
    ).toThrow("holds no Comfy key on its server")
    expect(() =>
      checkSite({ ...ownerSite, engineKey: "missing" }, wanted)
    ).toThrow("holds no Comfy key on its server")
  })

  it("refuses an owner server that locks its routes with a token the capture does not hold", () => {
    expect(() => checkSite({ ...ownerSite, lock: "token" }, wanted)).toThrow(
      "locks its owner routes with token"
    )
  })
})

describe("the Share scene's link", () => {
  const site = "http://127.0.0.1:8788"

  it("takes the shared page the dialog links to on the recorded site", () => {
    expect(shareLinkOf(`${site}/share/Zq3Ftb8mVwq1J0aXrN4u2A`, site)).toBe(
      `${site}/share/Zq3Ftb8mVwq1J0aXrN4u2A`
    )
  })

  it("refuses no link, a link to another site and a page that is not a share", () => {
    expect(() => shareLinkOf(null, site)).toThrow("no link")
    expect(() =>
      shareLinkOf("https://rosesfield.com/share/Zq3Ftb8mVwq1J0aXrN4u2A", site)
    ).toThrow("not a shared page")
    expect(() => shareLinkOf(`${site}/history`, site)).toThrow(
      "not a shared page"
    )
  })
})
