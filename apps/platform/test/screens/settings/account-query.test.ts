import { describe, expect, it } from "vitest"
import { readAccount } from "@/screens/settings/account-query"

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
