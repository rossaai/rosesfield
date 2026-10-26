import { describe, expect, it } from "vitest"
import { t } from "@/copy/t"
import { appFilterGroups } from "@/screens/library/filter-groups"

describe("the View filter's app groups", () => {
  it("gives the Characters group its own all value, not All apps", () => {
    const groups = appFilterGroups(null, () => undefined)
    const characters = groups.find((group) => group.id === "app-character")
    const image = groups.find((group) => group.id === "app-image")
    expect(characters?.choices[0]?.label).toBe(t("kind.all"))
    expect(image?.choices[0]?.label).toBe(t("history.filter.allApps"))
  })
})
