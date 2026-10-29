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
  const buttons = within(bar).getAllByRole("button", { name })
  const labelled =
    buttons.find((button) => button.textContent === name) ?? buttons[0]
  if (labelled === undefined) {
    throw new Error(`the bar holds no ${name} button`)
  }
  fireEvent.click(labelled)
  return screen.findByRole("dialog")
}

describe("the shell's dialogs", () => {
  it("opens the MCP dialog from MCP over the page, titled as the tab, with the command to copy, Cancel and Copy", async () => {
    openBar()
    const dialog = await press("MCP")
    expect(t("connect.title")).toBe(t("shell.nav.mcp"))
    expect(
      within(dialog).getByRole("heading", { name: t("connect.title") })
    ).toBeTruthy()
    expect(within(dialog).getByText(t("connect.claude.step.1"))).toBeTruthy()
    const command = dialog.querySelector("pre")
    expect(command?.textContent).toContain(
      "claude mcp add --transport http rosesfield"
    )
    expect(command?.className.split(" ")).toContain("whitespace-pre")
    expect(command?.className).not.toMatch(/break-all|whitespace-pre-wrap/)
    expect(command?.parentElement?.className.split(" ")).toContain(
      "overflow-x-auto"
    )
    const actions = within(dialog)
      .getAllByRole("button")
      .map((button) => button.textContent)
    expect(actions).toEqual(
      expect.arrayContaining([t("connect.cancel"), t("connect.copy")])
    )
    expect(actions).not.toContain("Connect")
    fireEvent.click(
      within(dialog).getByRole("radio", { name: t("connect.tab.chatgpt") })
    )
    expect(dialog.querySelector("pre")?.textContent).toMatch(/\/mcp$/)
    fireEvent.click(
      within(dialog).getByRole("button", { name: t("connect.cancel") })
    )
    expect(screen.queryByText(t("connect.claude.step.1"))).toBeNull()
  })

  it("asks only for your key in the MCP dialog when this browser holds none, with no client tabs", async () => {
    openBar({
      settings: { ...ownerSettings, keyFrom: "settings" },
      account: { ...account, key: "missing", credits: null },
    })
    const dialog = await press("MCP")
    expect(within(dialog).getByText(t("key.field"))).toBeTruthy()
    expect(dialog.querySelector("pre")).toBeNull()
    expect(within(dialog).queryAllByRole("radio")).toEqual([])
    expect(dialog.querySelectorAll("input, textarea")).toHaveLength(1)
    const link = within(dialog).getByRole("link", { name: t("key.page") })
    expect(link.getAttribute("data-slot")).toBe("inline-chip")
    expect(link.className.split(" ")).not.toContain("underline")
    expect(
      within(dialog).getByRole("button", { name: t("key.save") })
    ).toHaveProperty("type", "submit")
  })

  it("opens the MCP dialog from MCP in the phone menu, right after the 3D apps, with no route change", async () => {
    openBar()
    const bar = await screen.findByRole("banner", { name: "Rosesfield" })
    fireEvent.mouseDown(
      within(bar).getByRole("button", { name: t("shell.menu.open") })
    )
    const items = await screen.findAllByRole("menuitem")
    const mcp = items.find((item) => item.textContent === "MCP")
    if (mcp === undefined) {
      throw new Error("the phone menu holds no MCP")
    }
    expect(mcp.getAttribute("href")).toBeNull()
    expect(items[items.indexOf(mcp) - 1]?.getAttribute("href")).toBe(
      "/apps/three-d"
    )
    fireEvent.click(mcp)
    const dialog = await screen.findByRole("dialog")
    expect(
      within(dialog).getByRole("heading", { name: t("connect.title") })
    ).toBeTruthy()
    expect(within(dialog).getByText(t("connect.claude.step.1"))).toBeTruthy()
  })

  it("opens the credits as a dialog with the balance, the key state and Comfy billing", async () => {
    openBar()
    const dialog = await press("13 credits")
    expect(within(dialog).getByText(t("key.account.title"))).toBeTruthy()
    expect(
      within(dialog).getByText(t("key.balance", { amount: "13" }))
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
