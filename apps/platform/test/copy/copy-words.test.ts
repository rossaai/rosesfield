import { describe, expect, it } from "vitest"
import { GatewayRefusedError } from "@/api/gateway-refused.error"
import { GatewayUnreachableError } from "@/api/gateway-unreachable.error"
import { wordsForCode, wordsForError } from "@/copy/error-words"
import { t, tCatalog, tCount } from "@/copy/t"

describe("t", () => {
  it("fills each value and formats numbers", () => {
    expect(t("run.price.credits", { amount: 0.02 })).toBe("0.02 Comfy credits")
    expect(t("toast.runFailed", { app: "Image" })).toBe("Your Image run failed")
  })

  it("picks the plural form from the count", () => {
    expect(tCount("shell.history.working", 1)).toBe("1 run working")
    expect(tCount("shell.history.working", 3)).toBe("3 runs working")
  })

  it("falls back to the key when no copy file holds it", () => {
    expect(tCatalog("nowhere.name")).toBe("nowhere.name")
    expect(tCatalog("choice.quality.draft")).toBe("Draft")
  })
})

describe("wordsForCode", () => {
  it("gives a known code its words and its act", () => {
    expect(wordsForCode("ENGINE_KEY_INVALID")).toEqual({
      title: "Comfy refused your key",
      body: "Check the key on the server, then check it again in Settings.",
      action: { label: "Open settings", act: "settings" },
    })
  })

  it("fills the time limit and the thing that is gone", () => {
    expect(wordsForCode("RUN_TIMED_OUT", { minutes: 10 }).title).toBe(
      "The run passed its limit of 10 minutes"
    )
    expect(wordsForCode("RUN_NOT_FOUND", { thing: "run" }).title).toBe(
      "This run does not exist"
    )
  })

  it("states no wait of 0 seconds when the refusal names no wait", () => {
    const words = wordsForCode("ENGINE_RATE_LIMITED")
    expect(words.body).toBe(
      "Comfy did not say how long to wait. Your inputs are kept."
    )
    expect(words.body).not.toContain("0 seconds")
  })

  it("offers no retry where a retry cannot succeed", () => {
    expect(wordsForCode("RUN_INPUT_REFUSED").action).toBeNull()
  })

  it("speaks for an unknown code without showing it", () => {
    const words = wordsForCode("SOMETHING_NEW")
    expect(words.title).toBe("The server could not do this")
    expect(JSON.stringify(words)).not.toContain("SOMETHING_NEW")
  })
})

describe("wordsForError", () => {
  it("reads the wait from a refusal and names a lost connection", () => {
    const limited = new GatewayRefusedError({
      code: "ENGINE_RATE_LIMITED",
      status: 429,
      retryAfterSeconds: 30,
    })
    expect(wordsForError(limited).body).toBe("You can try again in 30 seconds.")
    expect(
      wordsForError(new GatewayUnreachableError({ cause: null })).title
    ).toBe("Rosesfield cannot reach its server")
  })
})
