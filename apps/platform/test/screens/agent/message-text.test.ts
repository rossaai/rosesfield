import { describe, expect, it } from "vitest"
import { messageText, splitMessage } from "@/screens/agent/message-text"

describe("a message and its attachments", () => {
  it("reads back the prompt and the ids it was sent with", () => {
    const text = messageText({
      prompt: "  Put her on the beach  ",
      assetIds: ["asset-1", "asset-2"],
      characterIds: ["character-1"],
    })
    expect(splitMessage(text)).toEqual({
      prompt: "Put her on the beach",
      assetIds: ["asset-1", "asset-2"],
      characterIds: ["character-1"],
    })
  })

  it("keeps every line of a message that names no attachment", () => {
    expect(splitMessage("First line\nSecond line")).toEqual({
      prompt: "First line\nSecond line",
      assetIds: [],
      characterIds: [],
    })
  })
})
