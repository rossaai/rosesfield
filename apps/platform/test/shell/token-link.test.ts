import { describe, expect, it } from "vitest"
import { tokenOfHash } from "@/shell/token-link"

const token = "rosesfield-judge-token-0123456789abcdef"

describe("the owner link's token", () => {
  it("reads the token from the link's hash", () => {
    expect(tokenOfHash(`#token=${token}`)).toBe(token)
    expect(tokenOfHash(`#token=${token}%21`)).toBe(`${token}!`)
  })

  it("gives no token for a broken percent sequence, and throws nothing", () => {
    expect(tokenOfHash(`#token=${token}%E0%A4%A`)).toBeNull()
    expect(tokenOfHash("#token=short")).toBeNull()
  })
})
