import { cleanup, fireEvent, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { Transcript, TranscriptItem } from "@/api/conversation-wire"
import { t } from "@/copy/t"
import { NoModel } from "@/screens/agent/agent-parts"
import { TranscriptItems } from "@/screens/agent/conversation-messages"
import { shownTitleOf } from "@/screens/agent/conversation-screen"
import { KeyDialogProvider } from "@/shell/key-dialog-context"
import { renderAgent } from "./agent-screen-render"

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function transcriptOf(
  title: string | null,
  items: TranscriptItem[]
): Transcript {
  return {
    conversation: {
      id: "c3cfa88a-1688-41ae-a38f-b931f134c3d9",
      title,
      runApproval: "ask",
      createdAt: "2026-10-21T22:12:35.755Z",
    },
    items,
  }
}

describe("the conversation's header title", () => {
  const first: TranscriptItem = {
    type: "person",
    text: "Make a red bicycle on a quiet street\n\nIn the morning light",
  }

  it("shows no title while the title is the first message the server copied", () => {
    expect(
      shownTitleOf(
        transcriptOf("Make a red bicycle on a quiet street", [first])
      )
    ).toBeNull()
    expect(shownTitleOf(transcriptOf(null, [first]))).toBeNull()
    expect(
      shownTitleOf(transcriptOf("Make a red bicycle", [first]))
    ).toBeNull()
  })

  it("shows the name the person gave it", () => {
    expect(shownTitleOf(transcriptOf("Bicycle ideas", [first]))).toBe(
      "Bicycle ideas"
    )
  })
})

describe("the person's message", () => {
  it("caps at 85 percent of the column and sits at its end", async () => {
    renderAgent(() => (
      <TranscriptItems
        conversationId="c3cfa88a-1688-41ae-a38f-b931f134c3d9"
        items={[{ type: "person", text: "A red bicycle" }]}
      />
    ))
    const text = await screen.findByText("A red bicycle")
    expect(text.className).toContain("max-w-[85%]")
    const row = text.closest("[data-slot=your-message]")
    expect(row?.className).toContain("w-full")
    expect(row?.className).toContain("items-end")
  })

  it("shows a turn's credits as a coin figure with no unit word", async () => {
    renderAgent(() => (
      <TranscriptItems
        conversationId="c3cfa88a-1688-41ae-a38f-b931f134c3d9"
        items={[{ type: "credits", credits: 0.1214 }]}
      />
    ))
    const credits = await vi.waitFor(() => {
      const found = document.querySelector("[data-slot=turn-credits]")
      if (found === null) {
        throw new Error("no credits")
      }
      return found
    })
    expect(credits.textContent).toBe("0.12")
    expect(credits.querySelector("[data-slot=credit-price]")).not.toBeNull()
  })
})

describe("the no-key notice", () => {
  it("opens the key dialog from its action, named Add your Comfy key, with no route change", async () => {
    vi.stubGlobal("fetch", () => new Promise(() => undefined))
    renderAgent(() => (
      <KeyDialogProvider>
        <NoModel />
      </KeyDialogProvider>
    ))
    const action = await screen.findByRole("button", { name: t("key.add") })
    expect(action.closest("a")).toBeNull()
    fireEvent.click(action)
    expect(await screen.findByRole("dialog")).not.toBeNull()
  })
})
