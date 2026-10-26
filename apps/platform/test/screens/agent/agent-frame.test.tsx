import { cleanup, fireEvent, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { t } from "@/copy/t"
import { AgentFrame, ConversationsDrawer } from "@/screens/agent/agent-frame"
import { isConversationOpen } from "@/screens/agent/conversation-queries"
import { conversations, renderAgent } from "./agent-screen-render"

const [older, newer] = conversations as [
  (typeof conversations)[number],
  (typeof conversations)[number],
]

function sidebar(): Promise<HTMLElement> {
  return screen.findByRole("complementary", {
    name: t("agent.conversations"),
  })
}

beforeEach(() => {
  vi.stubGlobal("fetch", () => new Promise(() => undefined))
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe("the agent's conversations", () => {
  it("sit in a sidebar beside the conversation, newest first, with the open one current", async () => {
    renderAgent(() => <AgentFrame>{null}</AgentFrame>, `/agent/${older.id}`)
    const column = await sidebar()
    const titles = await within(column).findAllByRole("link")
    expect(titles.map((one) => one.textContent)).toEqual([
      newer.title,
      older.title,
    ])
    const open = within(column).getByRole("link", { name: older.title ?? "" })
    expect(open.getAttribute("aria-current")).toBe("page")
    const start = within(column).getByRole("button", {
      name: t("agent.start"),
    })
    expect(start.getAttribute("aria-current")).toBeNull()
    expect(column.className).toContain("w-sidebar")
  })

  it("sit in an inset panel with an input column's radius, ground and gap from the page edge", async () => {
    renderAgent(() => <AgentFrame>{null}</AgentFrame>, "/agent")
    const column = await sidebar()
    expect(column.getAttribute("data-variant")).toBe("inset")
    expect(column.className.split(" ")).toEqual(
      expect.arrayContaining(["rounded-card", "bg-surface", "overflow-hidden"])
    )
    const frame = column.closest("[data-slot='agent-sidebar-frame']")
    expect(frame?.className.split(" ")).toEqual(
      expect.arrayContaining([
        "@regular:ps-4",
        "@regular:pt-2",
        "@regular:pb-4",
      ])
    )
    expect(
      column.closest("[data-slot='agent-frame']")?.className.split(" ")
    ).toContain("@regular:gap-2")
  })

  it("rename a conversation from its row", async () => {
    renderAgent(() => <AgentFrame>{null}</AgentFrame>, "/agent")
    const row = (
      await within(await sidebar()).findByRole("link", {
        name: newer.title ?? "",
      })
    ).closest("li")
    if (row === null) {
      throw new Error("the row is missing")
    }
    fireEvent.click(within(row).getByRole("button", { name: t("agent.more") }))
    fireEvent.click(
      await screen.findByRole("menuitem", { name: t("agent.rename") })
    )
    const title = await screen.findByRole("textbox")
    expect(title).toHaveProperty("value", newer.title)
  })

  it("open from a drawer on a phone", async () => {
    renderAgent(() => <ConversationsDrawer />, "/agent")
    fireEvent.click(
      await screen.findByRole("button", { name: t("agent.conversations") })
    )
    const drawer = await screen.findByRole("dialog")
    expect(
      await within(drawer).findByRole("link", { name: older.title ?? "" })
    ).toBeDefined()
    expect(
      within(drawer)
        .getByRole("complementary", { name: t("agent.conversations") })
        .getAttribute("data-variant")
    ).toBe("flush")
    expect(
      within(drawer).getAllByRole("button", { name: t("agent.more") })
    ).toHaveLength(conversations.length)
  })

  it("leave the open conversation only when it is the one deleted", () => {
    expect(isConversationOpen(`/agent/${older.id}`, older.id)).toBe(true)
    expect(isConversationOpen(`/agent/${newer.id}`, older.id)).toBe(false)
    expect(isConversationOpen("/agent", older.id)).toBe(false)
  })
})
