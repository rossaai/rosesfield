import type { AccountStatus } from "@rosesfield/contract"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { holdVisitorKey, readVisitorKey } from "@/api/visitor-keys"
import { formatNumber } from "@/copy/format"
import { t } from "@/copy/t"
import type { CopyKey } from "@/copy.en"
import {
  comfyBillingPage,
  comfyKeyPage,
} from "@/screens/app/hosted/model-notice"
import { accountPath } from "@/screens/settings/account-query"
import { KeyForm } from "@/screens/settings/key-dialog"

const realFetch = globalThis.fetch

const accounts: Readonly<Record<string, AccountStatus>> = {
  "comfyui-good": {
    key: "valid",
    credits: 4201.5,
    retentionDays: 30,
    cap: null,
  },
  "comfyui-wrong": {
    key: "wrong",
    credits: null,
    retentionDays: 30,
    cap: null,
  },
  "comfyui-free": {
    key: "no-plan",
    credits: null,
    retentionDays: 30,
    cap: null,
  },
  "comfyui-team": {
    key: "outside-workspace",
    credits: null,
    retentionDays: 30,
    cap: null,
  },
}

const noKey: AccountStatus = {
  key: "missing",
  credits: null,
  retentionDays: 30,
  cap: null,
}

type Sent = { url: string; key: string | null }

function answerAccounts(): Sent[] {
  const sent: Sent[] = []
  globalThis.fetch = async (input, init) => {
    const key = new Headers(init?.headers).get("X-Engine-Key")
    sent.push({ url: String(input), key })
    if (key === "comfyui-gone") {
      throw new TypeError("Failed to fetch")
    }
    const account = key === null ? noKey : (accounts[key] ?? noKey)
    return Response.json({ account })
  }
  return sent
}

function renderForm(): { onDone: () => void } {
  const onDone = vi.fn()
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <KeyForm onDone={onDone} />
    </QueryClientProvider>
  )
  return { onDone }
}

function paste(key: string): void {
  const input = document.querySelector("input")
  if (input === null) {
    throw new Error("the form has no key field")
  }
  fireEvent.change(input, { target: { value: key } })
  fireEvent.click(screen.getByRole("button", { name: t("key.save") }))
}

afterEach(() => {
  cleanup()
  globalThis.fetch = realFetch
  holdVisitorKey("engine", null)
})

describe("the form that adds your Comfy key", () => {
  it("shows one sentence and links to Comfy's key page, Privacy and Terms", () => {
    answerAccounts()
    renderForm()
    expect(screen.getByText(t("key.sentence"))).not.toBeNull()
    const links = screen.getAllByRole("link")
    expect(
      links.map((link) => [link.textContent, link.getAttribute("href")])
    ).toEqual([
      [t("key.page"), comfyKeyPage],
      [t("shell.footer.privacy"), "/privacy"],
      [t("shell.footer.terms"), "/terms"],
    ])
    expect(screen.getByText(t("key.legal"))).not.toBeNull()
  })

  it("sends the pasted key in its header, shows the balance and keeps the key", async () => {
    const sent = answerAccounts()
    const { onDone } = renderForm()
    paste("  comfyui-good  ")
    const balance = t("key.balance", { amount: formatNumber(4201.5) })
    expect(await screen.findByText(balance)).not.toBeNull()
    expect(screen.getByText(t("key.valid"))).not.toBeNull()
    expect(sent).toContainEqual({ url: accountPath, key: "comfyui-good" })
    await waitFor(() => expect(readVisitorKey("engine")).toBe("comfyui-good"))
    fireEvent.click(screen.getByRole("button", { name: t("key.done") }))
    expect(onDone).toHaveBeenCalledOnce()
  })

  it.each<{
    key: string
    title: CopyKey
    body: CopyKey
    link: { href: string; label: CopyKey }
  }>([
    {
      key: "comfyui-wrong",
      title: "key.wrong.title",
      body: "key.wrong.body",
      link: { href: comfyKeyPage, label: "key.page" },
    },
    {
      key: "comfyui-free",
      title: "key.no-plan.title",
      body: "key.no-plan.body",
      link: { href: comfyBillingPage, label: "key.no-plan.action" },
    },
    {
      key: "comfyui-team",
      title: "key.outside-workspace.title",
      body: "key.outside-workspace.body",
      link: { href: comfyKeyPage, label: "key.page" },
    },
  ])(
    "says why Comfy refused $key, with the link that fixes it, and keeps no key",
    async ({ key, title, body, link }) => {
      answerAccounts()
      renderForm()
      paste(key)
      const alert = await screen.findByRole("alert")
      expect(alert.textContent).toContain(t(title))
      expect(alert.textContent).toContain(t(body))
      const fix = alert.querySelector("a")
      expect(fix?.getAttribute("href")).toBe(link.href)
      expect(fix?.textContent).toBe(t(link.label))
      expect(readVisitorKey("engine")).toBeNull()
      expect(screen.queryByText(t("key.valid"))).toBeNull()
    }
  )

  it("says Comfy did not answer when the check fails, and keeps no key", async () => {
    answerAccounts()
    renderForm()
    paste("comfyui-gone")
    const alert = await screen.findByRole("alert")
    expect(alert.textContent).toContain(t("key.unreachable.title"))
    expect(readVisitorKey("engine")).toBeNull()
  })

  it("names an empty key before it asks Comfy", () => {
    const sent = answerAccounts()
    renderForm()
    paste("   ")
    expect(screen.getByText(t("settings.visitor.required"))).not.toBeNull()
    expect(sent.filter((request) => request.key !== null)).toEqual([])
  })
})
