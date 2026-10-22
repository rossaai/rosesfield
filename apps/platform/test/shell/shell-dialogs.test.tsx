import { ToastProvider } from "@rosesfield/ui/components/toast"
import { TooltipProvider } from "@rosesfield/ui/components/tooltip"
import { cleanup, fireEvent, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { t } from "@/copy/t"
import { comfyBillingPage } from "@/screens/app/hosted/model-notice"
import { ShellDialogsProvider } from "@/shell/shell-dialogs"
import { TopBar } from "@/shell/top-bar"
import { account, ownerSettings, renderAt } from "./shell-router"

afterEach(cleanup)

function openBar(seeds = { settings: ownerSettings, account }): void {
  renderAt(
    "/library",
    () => (
      <ToastProvider>
        <TooltipProvider>
          <ShellDialogsProvider>
            <TopBar />
          </ShellDialogsProvider>
        </TooltipProvider>
      </ToastProvider>
    ),
    seeds
  )
}

async function press(name: string): Promise<HTMLElement> {
  const bar = await screen.findByRole("banner", { name: "Rosesfield" })
  fireEvent.click(within(bar).getByRole("button", { name }))
  return screen.findByRole("dialog")
}

describe("the shell's dialogs", () => {
  it("opens Connect over the page with the command to copy, Cancel and Connect", async () => {
    openBar()
    const dialog = await press("Connect")
    expect(
      within(dialog).getByRole("heading", { name: t("connect.title") })
    ).toBeTruthy()
    expect(within(dialog).getByText(t("connect.claude.step.1"))).toBeTruthy()
    expect(dialog.querySelector("pre")?.textContent).toContain(
      "claude mcp add --transport http rosesfield"
    )
    const actions = within(dialog)
      .getAllByRole("button")
      .map((button) => button.textContent)
    expect(actions).toEqual(
      expect.arrayContaining([t("connect.cancel"), t("shell.nav.connect")])
    )
    fireEvent.click(
      within(dialog).getByRole("radio", { name: t("connect.tab.chatgpt") })
    )
    expect(dialog.querySelector("pre")?.textContent).toMatch(/\/mcp$/)
    fireEvent.click(
      within(dialog).getByRole("button", { name: t("connect.cancel") })
    )
    expect(screen.queryByText(t("connect.claude.step.1"))).toBeNull()
  })

  it("asks for your key in Connect when this browser holds none", async () => {
    openBar({
      settings: { ...ownerSettings, keyFrom: "settings" },
      account: { ...account, key: "missing", credits: null },
    })
    const bar = await screen.findByRole("banner", { name: "Rosesfield" })
    fireEvent.click(within(bar).getByRole("button", { name: "Connect" }))
    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByText(t("key.field"))).toBeTruthy()
    expect(dialog.querySelector("pre")).toBeNull()
    expect(
      within(dialog).getByRole("button", { name: t("shell.nav.connect") })
    ).toHaveProperty("type", "submit")
  })

  it("opens the credits as a dialog with the balance, the key state and Comfy billing", async () => {
    openBar()
    const dialog = await press("12.5 credits")
    expect(within(dialog).getByText(t("key.account.title"))).toBeTruthy()
    expect(
      within(dialog).getByText(t("key.balance", { amount: "12.5" }))
    ).toBeTruthy()
    expect(
      within(dialog).getByText(t("settings.engine.status.unchecked"))
    ).toBeTruthy()
    expect(
      within(dialog)
        .getByRole("link", { name: t("key.no-plan.action") })
        .getAttribute("href")
    ).toBe(comfyBillingPage)
  })
})
