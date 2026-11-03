import { expect, type Locator, type Page, test } from "@playwright/test"
import { settled } from "./settled"

type Words = { full: string; shown: string }

function isPhone(page: Page): boolean {
  return (page.viewportSize()?.width ?? 0) < 768
}

async function motionTitle(page: Page, width: number): Promise<Locator> {
  await page.addInitScript(() => {
    window.localStorage.setItem("rosesfield.welcome", "seen")
  })
  await page.setViewportSize({ width, height: 800 })
  await page.goto("/apps/motion")
  const title = page.locator("h1:has([data-slot='app-title'])")
  await expect(featuredWord(title)).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
  await settled(title)
  return title
}

function featuredWord(title: Locator): Locator {
  return title.locator(
    "[data-slot='badge'][data-kind='featured'] [data-slot='count-badge-words']"
  )
}

async function shownWords(word: Locator): Promise<Words> {
  return await word.evaluate((element) => {
    const text = element.firstChild
    if (!(text instanceof Text)) {
      throw new Error("the badge holds no text node")
    }
    let clip: Element | null = element.parentElement
    while (clip !== null && getComputedStyle(clip).overflowX === "visible") {
      clip = clip.parentElement
    }
    if (clip === null) {
      throw new Error("no clipping box above the badge")
    }
    const edge = clip.getBoundingClientRect().right
    const full = text.data
    let shown = ""
    for (let at = 0; at < full.length; at += 1) {
      const range = document.createRange()
      range.setStart(text, at)
      range.setEnd(text, at + 1)
      if (range.getBoundingClientRect().right > edge + 0.5) {
        break
      }
      shown += full[at]
    }
    return { full, shown }
  })
}

test("at 1024 px Motion's title cuts its name with an ellipsis, keeps the Featured badge whole, and shows the whole name in a tooltip", async ({
  page,
}) => {
  test.skip(isPhone(page), "the title row shows in the regular window")
  const title = await motionTitle(page, 1024)
  const badge = await shownWords(featuredWord(title))
  expect(badge.shown).toBe(badge.full)
  const name = title.locator("[data-slot='app-title-name']")
  const cut = await name.evaluate((element) => ({
    isCut: element.scrollWidth > element.clientWidth,
    end: getComputedStyle(element).textOverflow,
  }))
  expect(cut).toEqual({ isCut: true, end: "ellipsis" })
  await name.hover()
  await expect(page.locator("[data-slot='tooltip-content']")).toHaveText(
    "Motion"
  )
})

test("control: at 1440 px Motion's title shows its whole name and its whole Featured badge", async ({
  page,
}) => {
  test.skip(isPhone(page), "the title row shows in the regular window")
  const title = await motionTitle(page, 1440)
  const badge = await shownWords(featuredWord(title))
  expect(badge.shown).toBe(badge.full)
  expect(
    await title.evaluate(
      (element) => element.scrollWidth <= element.clientWidth
    )
  ).toBe(true)
  await expect(title).toHaveText("MotionFeatured")
})
