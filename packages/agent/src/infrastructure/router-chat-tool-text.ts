type Message = Record<string, unknown>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isText(part: unknown): part is { type: "text"; text: string } {
  return isRecord(part) && part.type === "text" && typeof part.text === "string"
}

/** The texts of a tool result: its content when pi sends a string, else each text part pi writes when it marks the result for caching. */
export function textsOf(message: Message): string[] | null {
  if (typeof message.content === "string") {
    return [message.content]
  }
  if (!Array.isArray(message.content)) {
    return null
  }
  return message.content.flatMap((part: unknown) =>
    isText(part) ? [part.text] : []
  )
}

/** The tool result with its texts replaced in order, each part keeping its other fields, such as its `cache_control`. */
export function withTexts(message: Message, texts: readonly string[]): Message {
  if (typeof message.content === "string") {
    return { ...message, content: texts[0] ?? "" }
  }
  if (!Array.isArray(message.content)) {
    return message
  }
  let at = 0
  return {
    ...message,
    content: message.content.map((part: unknown) => {
      if (!isText(part)) {
        return part
      }
      const text = texts[at] ?? part.text
      at += 1
      return { ...part, text }
    }),
  }
}
