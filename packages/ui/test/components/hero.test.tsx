import { HeroBanner, HeroFan } from "@rosesfield/ui/components/hero"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { readSource } from "../read-source"

afterEach(cleanup)

describe("HeroBanner", () => {
  it("is one link on every width, at least 400 px tall from the width switch and compact on a phone, its action a span", () => {
    render(
      <HeroBanner
        href="/apps/video"
        headline="Make a clip from a photo"
        lead="Pick a model and a preset"
        action="Open Video"
      />
    )
    const banner = screen.getByRole("link")
    expect(banner.className.split(" ")).toEqual(
      expect.arrayContaining(["flex", "@regular:min-h-100", "bg-surface"])
    )
    expect(banner.className.split(" ")).not.toContain("hidden")
    expect(banner.className.split(" ")).not.toContain("min-h-100")
    expect(banner.querySelectorAll("a, button")).toHaveLength(0)
  })

  it("sets one headline at the statement tier from the emitted tokens, with no kicker, wash or glow", () => {
    render(
      <HeroBanner
        href="/apps/video"
        headline="Make a clip from a photo"
        lead="Pick a model and a preset"
        action="Open Video"
      />
    )
    const headline = document.querySelector("[data-slot='hero-headline']")
    expect(headline?.textContent).toBe("Make a clip from a photo")
    expect(headline?.className.split(" ")).toEqual(
      expect.arrayContaining([
        "text-[clamp(var(--text-statement-floor),calc(var(--text-statement-share)*100vw),var(--text-statement-ceiling))]",
        "leading-(--text-statement-leading)",
      ])
    )
    expect(document.querySelector("[data-slot^='hero-glow']")).toBeNull()
    const banner = screen.getByRole("link")
    expect(banner.innerHTML).not.toMatch(/gradient|radial|blur-/)
    const tokens = readSource("tokens.css")
    expect(tokens).toContain("--text-statement-floor: 44px;")
    expect(tokens).toContain("--text-statement-ceiling: 88px;")
  })

  it("draws its action as the primary button, pressing on the press preset", () => {
    render(
      <HeroBanner
        href="/apps/video"
        headline="Make a clip from a photo"
        lead="Pick a model and a preset"
        action="Open Video"
      />
    )
    const classes = screen.getByText("Open Video").className.split(" ")
    expect(classes).toEqual(
      expect.arrayContaining(["bg-ink", "text-canvas", "motion-press"])
    )
    expect(classes.filter((name) => name.includes("after:"))).toEqual([])
  })

  it("rings the banner at the registry's offset, outside its edge", () => {
    render(
      <HeroBanner
        href="/apps/video"
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

describe("HeroBanner's tag and portraits", () => {
  it("opens with a tinted tag over the headline, inside the one link", () => {
    render(
      <HeroBanner
        href="/apps/image"
        tag={{ label: "MIT licence", icon: <svg /> }}
        headline="Make images and video"
        lead="Every app works with your key"
        action="Open Image"
      />
    )
    const tag = document.querySelector("[data-slot='hero-tag']")
    expect(tag?.textContent).toBe("MIT licence")
    expect(tag?.className.split(" ")).toEqual(
      expect.arrayContaining(["bg-hor-tint", "text-hor-text", "h-button-small"])
    )
    expect(tag?.nextElementSibling?.getAttribute("data-slot")).toBe(
      "hero-headline"
    )
    expect(screen.getByRole("link").querySelectorAll("a, button")).toHaveLength(
      0
    )
  })

  it("stands a portrait on each bottom corner, 300 px wide, narrowing so it never reaches the text", () => {
    render(
      <HeroBanner
        href="/apps/image"
        headline="Make images and video"
        lead="Every app works with your key"
        action="Open Image"
        portraits={{ start: { src: "a.webp" }, end: { src: "b.webp" } }}
      />
    )
    const banner = screen.getByRole("link")
    expect(banner.className.split(" ")).toEqual(
      expect.arrayContaining([
        "@container/hero",
        "[--hero-portrait:min(--spacing(75),calc((100cqw_-_var(--spacing)*146)/2))]",
      ])
    )
    const portraits = [
      ...banner.querySelectorAll<HTMLImageElement>(
        "[data-slot='hero-portrait']"
      ),
    ]
    expect(portraits.map((one) => one.getAttribute("src"))).toEqual([
      "a.webp",
      "b.webp",
    ])
    expect(portraits.map((one) => one.alt)).toEqual(["", ""])
    expect(portraits[0]?.className.split(" ")).toEqual(
      expect.arrayContaining([
        "bottom-0",
        "left-0",
        "w-(--hero-portrait)",
        "hidden",
        "@regular:block",
      ])
    )
    expect(portraits[1]?.className.split(" ")).toEqual(
      expect.arrayContaining(["bottom-0", "right-0"])
    )
  })

  it("holds the top of a portrait with a top focus, on the wide corners and in the phone's squares, and the centre otherwise", () => {
    render(
      <HeroBanner
        href="/apps/edit"
        headline="Make images and video"
        lead="Every app works with your key"
        action="Open Edit"
        portraits={{
          start: { src: "a.webp", focus: "top" },
          end: { src: "b.webp" },
        }}
      />
    )
    const wide = [
      ...document.querySelectorAll<HTMLImageElement>(
        "[data-slot='hero-portrait']"
      ),
    ]
    const phone = [
      ...document.querySelectorAll<HTMLImageElement>(
        "[data-slot='hero-phone-portraits'] img"
      ),
    ]
    for (const pair of [wide, phone]) {
      expect(pair[0]?.className.split(" ")).toContain("object-top")
      expect(pair[1]?.className.split(" ")).not.toContain("object-top")
      expect(pair[1]?.className.split(" ")).toContain("object-cover")
    }
  })

  it("draws no portrait and no tag when none is given", () => {
    render(
      <HeroBanner
        href="/apps/image"
        headline="Make images and video"
        lead="Every app works with your key"
        action="Open Image"
      />
    )
    expect(document.querySelector("[data-slot='hero-portrait']")).toBeNull()
    expect(document.querySelector("[data-slot='hero-tag']")).toBeNull()
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
