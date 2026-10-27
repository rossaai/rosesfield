import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { t } from "@/copy/t"
import { AgentStartScreen } from "@/screens/agent/agent-start-screen"
import { KeyDialogProvider } from "@/shell/key-dialog-context"
import { renderAgent } from "./agent-screen-render"

function classesOf(element: Element | null | undefined): string[] {
  return element?.getAttribute("class")?.split(" ") ?? []
}

afterEach(cleanup)

describe("the empty agent screen", () => {
  it("centers its heading in the space between the header and the composer on a phone, and keeps the regular window's block", async () => {
    renderAgent(() => (
      <KeyDialogProvider>
        <AgentStartScreen />
      </KeyDialogProvider>
    ))
    const heading = await screen.findByRole("heading", {
      name: t("agent.start.title"),
    })
    const block = heading.closest("[data-slot='agent-start-heading']")
    expect(classesOf(block)).toEqual(
      expect.arrayContaining(["my-auto", "text-center", "@regular:my-0"])
    )
    const space = block?.parentElement
    expect(classesOf(space)).toEqual(
      expect.arrayContaining(["flex", "flex-col", "items-center", "pt-s3"])
    )
    expect(classesOf(space)).not.toContain("gap-s6")
    const composer = await screen.findByRole("textbox", {
      name: t("agent.prompt.label"),
    })
    const foot = [...(space?.children ?? [])].find((child) =>
      child.contains(composer)
    )
    expect(classesOf(foot)).toEqual(
      expect.arrayContaining(["sticky", "bottom-0", "order-last", "pt-s3"])
    )
    expect(classesOf(foot)).not.toContain("mt-auto")
  })
})
