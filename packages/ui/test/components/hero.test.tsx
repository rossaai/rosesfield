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

  it("lays a glow over the banner and a 736 by 270 ellipse behind the text", () => {
    render(
      <HeroBanner
        href="/apps/video"
        kicker="Video"
        headline="Make a clip from a photo"
        lead="Pick a model and a preset"
        action="Open Video"
      />
    )
    const glow = document.querySelector("[data-slot='hero-glow']")
    expect(glow?.className.split(" ")).toContain("inset-0")
    const ellipse = document.querySelector("[data-slot='hero-glow-ellipse']")
    expect(ellipse?.className.split(" ")).toEqual(
      expect.arrayContaining(["w-184", "h-67.5", "rounded-full"])
    )
  })

  it("answers a press anywhere on the banner on its action", () => {
    render(
      <HeroBanner
        href="/apps/video"
        kicker="Video"
        headline="Make a clip from a photo"
        lead="Pick a model and a preset"
        action="Open Video"
      />
    )
    const action = screen.getByText("Open Video")
    const classes = action.className.split(" ")
    expect(classes).toEqual(
      expect.arrayContaining([
        "group-hover/hero:after:opacity-10",
        "group-active/hero:after:opacity-20",
        "hover:after:opacity-10",
        "active:after:opacity-20",
      ])
    )
    expect(classes).not.toContain("active:after:opacity-10")
  })

  it("rings the banner at the registry's offset, outside its edge", () => {
    render(
      <HeroBanner
        href="/apps/video"
        kicker="Video"
        headline="Make a clip from a photo"
        lead="Pick a model and a preset"
        action="Open Video"
      />
    )
    const classes = screen.getByRole("link").className.split(" ")
    expect(classes).toContain(
      "focus-visible:outline-offset-(--spacing-focus-ring)"
    )
    expect(classes).not.toContain("focus-visible:outline-offset-4")
  })
})

describe("HeroFan", () => {
  it("fans four pictures over a two-line headline that names the model", () => {
    const { container } = render(
      <HeroFan
        pictures={["a", "b", "c", "d", "e"].map((id) => ({
          id,
          src: `${id}.png`,
        }))}
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

  it("narrows its pictures on a phone so the fan stays inside the page", () => {
    const { container } = render(
      <HeroFan
        pictures={["a", "b", "c", "d"].map((id) => ({ id, src: `${id}.png` }))}
        headline="Make an image with"
        model="Picture 2"
        line="Type a prompt below"
      />
    )
    for (const picture of container.querySelectorAll("img")) {
      expect(picture.className.split(" ")).toEqual(
        expect.arrayContaining(["w-22", "-mx-2", "@regular:w-35"])
      )
    }
  })
})
