import { cleanup, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { appWorkflows } from "@/catalog/app-workflows"
import { catalogApps } from "@/catalog/catalog-apps"
import { t } from "@/copy/t"
import { legalPages } from "@/screens/legal/legal-links"
import { PrivacyScreen } from "@/screens/legal/privacy-screen"
import { TermsScreen } from "@/screens/legal/terms-screen"
import { modelRowsOf } from "@/screens/welcome/open-weights"

afterEach(cleanup)

function pageText(): string {
  const main = document.querySelector("[data-slot='legal-page']")
  if (main === null) {
    throw new Error("the page has no legal main")
  }
  return main.textContent ?? ""
}

function hrefOf(name: string): string | null {
  const main = screen.getByRole("main")
  return within(main).getByRole("link", { name }).getAttribute("href")
}

describe("the Privacy page", () => {
  it("says the key goes to Comfy and is never stored or logged", () => {
    render(<PrivacyScreen />)
    expect(
      screen.getByRole("heading", { level: 1, name: t("legal.privacy.title") })
    ).not.toBeNull()
    const text = pageText()
    expect(text).toContain("sends your requests to Comfy with your key")
    expect(text).toContain("never stores it and never writes it to a log")
  })

  it("names what it keeps, for how long, where, the one cookie and the logs", () => {
    render(<PrivacyScreen />)
    const text = pageText()
    expect(text).toContain("A hash of your Comfy account id")
    expect(text).toContain("for 30 days after your last visit")
    expect(text).toContain("An output you share, for 90 days")
    expect(text).toContain("on Cloudflare")
    expect(text).toContain("one session cookie")
    expect(text).toContain("Cloudflare keeps a log of the requests")
  })

  it("names where to ask about your data", () => {
    render(<PrivacyScreen />)
    expect(hrefOf(t("legal.issue"))).toBe(legalPages.issues)
    expect(legalPages.issues).toBe(
      "https://github.com/rossaai/rosesfield/issues"
    )
  })

  it("ends with the footer that links both pages", () => {
    render(<PrivacyScreen />)
    const footer = screen.getByRole("contentinfo", { name: t("shell.name") })
    const footerHref = (name: string): string | null =>
      within(footer).getByRole("link", { name }).getAttribute("href")
    expect(footerHref(t("shell.footer.privacy"))).toBe("/privacy")
    expect(footerHref(t("shell.footer.terms"))).toBe("/terms")
  })
})

describe("the Terms page", () => {
  it("says what Rosesfield is, whose terms govern a run, rights, age and warranty", () => {
    render(<TermsScreen />)
    expect(
      screen.getByRole("heading", { level: 1, name: t("legal.terms.title") })
    ).not.toBeNull()
    const text = pageText()
    expect(text).toContain("open-source software")
    expect(text).toContain("It sends your requests to Comfy")
    expect(text).toContain("Every run happens on your own Comfy account")
    expect(text).toContain("Comfy's terms and each model maker's terms")
    expect(text).toContain("You hold the rights to what you add")
    expect(text).toContain(
      "You answer for what you make and for what you share"
    )
    expect(text).toContain("18 or older")
    expect(text).toContain("no warranty")
  })

  it("links Comfy's terms, the MIT licence and where to ask for a removal", () => {
    render(<TermsScreen />)
    expect(hrefOf(t("legal.terms.runs.action"))).toBe(
      "https://www.comfy.org/terms-of-service"
    )
    expect(hrefOf(t("legal.terms.warranty.action"))).toBe(
      "https://github.com/rossaai/rosesfield/blob/main/LICENSE"
    )
    expect(hrefOf(t("legal.issue"))).toBe(legalPages.issues)
  })

  it("links the licence of every model the shipped workflows load", () => {
    render(<TermsScreen />)
    const rows = modelRowsOf(catalogApps, appWorkflows)
    const list = document.querySelector("[data-slot='model-licences']")
    if (!(list instanceof HTMLElement)) {
      throw new Error("the page has no licence list")
    }
    const links = within(list).getAllByRole("link")
    expect(links.map((link) => link.getAttribute("href"))).toEqual(
      rows.map((row) => row.model.link)
    )
    expect(rows.length).toBeGreaterThan(0)
    expect(
      within(list)
        .getAllByRole("link", { name: t("welcome.licence.ltx-community") })
        .map((link) => link.getAttribute("href"))
    ).toContain("https://github.com/Lightricks/LTX-2/blob/main/LICENSE-2_x")
  })
})
