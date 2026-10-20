import { afterEach, describe, expect, it, vi } from "vitest"
import { GatewayUnreachableError } from "@/api/gateway-unreachable.error"
import {
  checkKey,
  keyCheckLimitMs,
  readAccount,
} from "@/screens/settings/account-query"

const realFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = realFetch
  vi.useRealTimers()
})

describe("readAccount", () => {
  it("reads the key status, the balance, the retention and the cap", () => {
    expect(
      readAccount({
        account: {
          key: "valid",
          credits: 4201.01,
          retentionDays: null,
          cap: { credits: 800, left: 637.5 },
        },
      })
    ).toEqual({
      key: "valid",
      credits: 4201.01,
      retentionDays: null,
      cap: { credits: 800, left: 637.5 },
    })
  })

  it("refuses a status it does not know and a cap with no figures", () => {
    expect(
      readAccount({
        account: { key: "maybe", credits: null, retentionDays: 30, cap: null },
      })
    ).toBeNull()
    expect(
      readAccount({
        account: { key: "valid", credits: 1, retentionDays: 30, cap: {} },
      })
    ).toBeNull()
  })
})

describe("checkKey", () => {
  it("stops a check Comfy does not answer within its limit", async () => {
    vi.useFakeTimers()
    globalThis.fetch = (_input, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject(new DOMException("The check took too long", "AbortError"))
        )
      })
    const checked = checkKey("comfyui-slow")
    const refused = expect(checked).rejects.toBeInstanceOf(
      GatewayUnreachableError
    )
    await vi.advanceTimersByTimeAsync(keyCheckLimitMs)
    await refused
  })

  it("answers a check that returns in time with its account", async () => {
    vi.useFakeTimers()
    globalThis.fetch = async () =>
      Response.json({
        account: { key: "valid", credits: 12, retentionDays: 30, cap: null },
      })
    await expect(checkKey("comfyui-good")).resolves.toEqual({
      key: "valid",
      credits: 12,
      retentionDays: 30,
      cap: null,
    })
    expect(vi.getTimerCount()).toBe(0)
  })
})
