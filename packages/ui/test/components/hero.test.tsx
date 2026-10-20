import { HeroBanner, HeroFan } from "@rosesfield/ui/components/hero"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

afterEach(cleanup)

describe("HeroBanner", () => {
  it("is one link 400 px tall, shown only from the width switch, its action a span", () => {
    render(
      <HeroBanner
        href="/apps/video"
        kicker="Video"
        headline="Make a clip from a photo"
        lead="Pick a model and a preset"
        action="Open Video"
      />
    )
    const banner = screen.getByRole("link")
    expect(banner.className.split(" ")).toEqual(
      expect.arrayContaining(["h-100", "mt-6", "hidden", "@regular:flex"])
    )
    expect(banner.querySelectorAll("a, button")).toHaveLength(0)
    const column = banner.lastElementChild
    expect(column?.className.split(" ")).toEqual(
      expect.arrayContaining(["w-146", "py-8"])
    )
  })
})

describe("HeroFan", () => {
  it("fans four pictures over a two-line headline that names the model", () => {
    const { container } = render(
      <HeroFan
        pictures={["a", "b", "c", "d", "e"].map((id) => ({ id, src: `${id}.png` }))}
        headline="Make an image with"
        model="Picture 2"
        line="Type a prompt below"
      />
    )
    expect(container.querySelectorAll("img")).toHaveLength(4)
    const heading = screen.getByRole("heading", { level: 2 })
    expect(heading.children).toHaveLength(2)
    expect(heading.lastElementChild?.textContent).toBe("Picture 2")
  })
})
