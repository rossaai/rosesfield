import { describe, expect, it } from "vitest"
import { clientSlotOf } from "#session/client-slot"

describe("the slot a client address counts in", () => {
  it("keeps an IPv4 address whole and reads an IPv4-mapped IPv6 address as IPv4", () => {
    expect(clientSlotOf("203.0.113.7")).toBe("203.0.113.7")
    expect(clientSlotOf("::ffff:203.0.113.7")).toBe("203.0.113.7")
    expect(clientSlotOf("203.0.113.8")).not.toBe(clientSlotOf("203.0.113.7"))
  })

  it("keys an IPv6 address by its /64, however it is written", () => {
    const slot = clientSlotOf("2001:db8:1:2::1")
    expect(slot).toBe("2001:db8:1:2::/64")
    expect(clientSlotOf("2001:0DB8:0001:0002:ffff:aaaa:bbbb:9")).toBe(slot)
    expect(clientSlotOf("[2001:db8:1:2::5]")).toBe(slot)
    expect(clientSlotOf("2001:db8:1:2::5%eth0")).toBe(slot)
    expect(clientSlotOf("2001:db8:1:3::1")).not.toBe(slot)
    expect(clientSlotOf("::1")).toBe("0:0:0:0::/64")
  })

  it("puts a missing address in one unknown slot", () => {
    expect(clientSlotOf(null)).toBe("unknown")
    expect(clientSlotOf(" ")).toBe("unknown")
  })
})
