import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { SettingSlider, valueSideOf } from "@/pieces/setting-slider"

afterEach(cleanup)

function valueOf(value: number): HTMLElement | null {
  render(
    <SettingSlider
      label="Length"
      shown={`${value} s`}
      value={value}
      min={4}
      max={30}
      step={1}
      onChange={() => undefined}
    />
  )
  return document.querySelector<HTMLElement>(
    "[data-slot='setting-slider-value']"
  )
}

describe("the setting slider's value", () => {
  it("stands at the track's end while the thumb is in its first half, so the thumb never crosses it", () => {
    const value = valueOf(5)
    expect(value?.dataset.side).toBe("end")
    expect(value?.className.split(" ")).toContain("right-3")
  })

  it("stands at the track's start once the thumb is past the middle", () => {
    const value = valueOf(25)
    expect(value?.dataset.side).toBe("start")
    expect(value?.className.split(" ")).toContain("left-3")
  })

  it("reads a range of one value as its first half, and the middle as its second", () => {
    expect(valueSideOf(5, 5, 5)).toBe("end")
    expect(valueSideOf(17, 4, 30)).toBe("start")
  })
})
