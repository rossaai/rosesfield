import type { AppListing } from "@rosesfield/contract"
import { describe, expect, it } from "vitest"
import { findCatalogApp } from "@/catalog/catalog-apps"
import { inputSlotsOf } from "@/screens/app/bar/input-slots"

const thumb = (id: string) => ({ id, src: "data:,", alt: id, caption: "x" })

function ads(): AppListing {
  const app = findCatalogApp("ads")
  if (app === null) {
    throw new Error("ads is missing from the catalog")
  }
  return app
}

describe("inputSlotsOf", () => {
  it("gives every shown asset input of the app its own slot", () => {
    const slots = inputSlotsOf(ads(), {}, [], () => undefined) ?? []
    expect(slots.map((slot) => slot.id)).toEqual(["product", "secondPhoto"])
    expect(slots[0]?.note).toBeUndefined()
    expect(slots[1]?.note).toBe("Optional")
  })

  it("opens the third slot once the second is filled", () => {
    const slots =
      inputSlotsOf(
        ads(),
        { product: ["p"], secondPhoto: ["s"] },
        [thumb("p"), thumb("s")],
        () => undefined
      ) ?? []
    expect(slots.map((slot) => slot.id)).toEqual([
      "product",
      "secondPhoto",
      "thirdPhoto",
    ])
    expect(slots[0]?.items).toEqual([{ id: "p", src: "data:,", alt: "p" }])
  })

  it("drops the add tile when a slot is full", () => {
    const added: string[] = []
    const slots =
      inputSlotsOf(ads(), { product: ["p"] }, [thumb("p")], (name) =>
        added.push(name)
      ) ?? []
    expect(slots[0]?.onAdd).toBeUndefined()
    slots[1]?.onAdd?.()
    expect(added).toEqual(["secondPhoto"])
  })
})
