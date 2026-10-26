import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react"
import type { ReactElement } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { RunApproval } from "@/api/conversation-wire"
import { t } from "@/copy/t"
import { noteAgentModel } from "@/screens/agent/agent-model"
import { AgentStartScreen } from "@/screens/agent/agent-start-screen"
import {
  keepRunApproval,
  readRunApproval,
  useRunApprovalOf,
} from "@/screens/agent/run-approval"
import { AgentPane } from "@/screens/settings/settings-panes"
import { KeyDialogProvider } from "@/shell/key-dialog-context"
import { conversations, renderAgent } from "./agent-screen-render"

type Sent = { method: string; path: string; body: unknown }

const conversation = conversations[0] ?? {
  id: "c3cfa88a-1688-41ae-a38f-b931f134c3d9",
  title: null,
  runApproval: "ask",
  createdAt: "2026-10-21T22:12:35.755Z",
}

const startedId = "7d1e2f3a-4b5c-4d6e-8f70-81a2b3c4d5e6"

function recordRequests(): Sent[] {
  const sent: Sent[] = []
  vi.stubGlobal(
    "fetch",
    (path: string, init?: { method?: string; body?: string }) => {
      const body: unknown =
        init?.body === undefined ? null : JSON.parse(init.body)
      sent.push({ method: init?.method ?? "GET", path, body })
      if (init?.method === "PATCH" || init?.method === "POST") {
        const id = init.method === "POST" ? startedId : conversation.id
        return Promise.resolve(
          Response.json({
            conversation: { ...conversation, ...Object(body), id },
          })
        )
      }
      return new Promise(() => undefined)
    }
  )
  return sent
}

function writes(sent: readonly Sent[]): Sent[] {
  return sent.filter((one) => one.method !== "GET")
}

function Held({ held }: { held: RunApproval }): ReactElement {
  const update = useRunApprovalOf(conversation.id, held)
  return <p>{update.status}</p>
}

beforeEach(() => {
  window.localStorage.clear()
  noteAgentModel("unknown")
})

afterEach(() => {
  cleanup()
  window.localStorage.clear()
  noteAgentModel("unknown")
  vi.unstubAllGlobals()
})

async function startConversation(): Promise<Sent[]> {
  const sent = recordRequests()
  renderAgent(() => (
    <KeyDialogProvider>
      <AgentStartScreen />
    </KeyDialogProvider>
  ))
  const field = await screen.findByRole("textbox", {
    name: t("agent.prompt.label"),
  })
  fireEvent.change(field, { target: { value: "A red bicycle" } })
  fireEvent.click(screen.getByRole("button", { name: t("agent.send") }))
  return sent
}

describe("the run mode", () => {
  it("is Auto until you choose Manual, which is kept as ask", () => {
    expect(readRunApproval()).toBe("auto")
    keepRunApproval("ask")
    expect(readRunApproval()).toBe("ask")
  })

  it("keeps Manual for this tab when the browser refuses to store it", () => {
    const refuse = (): never => {
      throw new DOMException("storage is off", "SecurityError")
    }
    const reads = vi
      .spyOn(Storage.prototype, "getItem")
      .mockImplementation(refuse)
    const writes = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(refuse)
    try {
      keepRunApproval("ask")
      expect(readRunApproval()).toBe("ask")
      keepRunApproval("auto")
      expect(readRunApproval()).toBe("auto")
    } finally {
      reads.mockRestore()
      writes.mockRestore()
    }
  })

  it("has no switch in Settings under Agent", async () => {
    recordRequests()
    renderAgent(() => <AgentPane />)
    expect(
      await screen.findAllByText(t("settings.agent.model"))
    ).not.toHaveLength(0)
    expect(screen.queryByRole("switch")).toBeNull()
    expect(screen.queryByText(t("agent.mode.manual.description"))).toBeNull()
    expect(screen.queryByText(t("agent.mode.label"))).toBeNull()
  })

  it("starts a new conversation on Auto when you chose nothing", async () => {
    const sent = await startConversation()
    await waitFor(() =>
      expect(writes(sent)).toEqual([
        {
          method: "POST",
          path: "/api/agent/conversations",
          body: { runApproval: "auto" },
        },
      ])
    )
  })

  it("starts a new conversation with the run mode the composer holds", async () => {
    keepRunApproval("ask")
    const sent = await startConversation()
    await waitFor(() =>
      expect(writes(sent)).toEqual([
        {
          method: "POST",
          path: "/api/agent/conversations",
          body: { runApproval: "ask" },
        },
      ])
    )
  })

  it("brings an open conversation to the run mode the composer holds", async () => {
    keepRunApproval("ask")
    const sent = recordRequests()
    renderAgent(() => <Held held="auto" />)
    await waitFor(() =>
      expect(writes(sent)).toEqual([
        {
          method: "PATCH",
          path: `/api/agent/conversations/${conversation.id}`,
          body: { runApproval: "ask" },
        },
      ])
    )
  })

  it("control: leaves a conversation alone that already holds the run mode", async () => {
    keepRunApproval("ask")
    const sent = recordRequests()
    renderAgent(() => <Held held="ask" />)
    await screen.findByText("idle")
    expect(writes(sent)).toEqual([])
  })
})
