import { expect, type Locator, type Page, test } from "@playwright/test"

const shortScreen = { width: 390, height: 480 }

async function boxOf(
  locator: Locator
): Promise<{ top: number; bottom: number }> {
  const box = await locator.boundingBox()
  if (box === null) {
    throw new Error("the element has no box")
  }
  return { top: box.y, bottom: box.y + box.height }
}

async function openPicker(page: Page, state: string): Promise<void> {
  await page.setViewportSize(shortScreen)
  await page.goto(`/gallery?entry=model-picker&state=${state}`)
  await expect(page.getByRole("searchbox").first()).toBeVisible()
}

async function openImagePicker(page: Page): Promise<Locator> {
  const trigger = page.getByRole("button", { name: /^Model/ }).first()
  await trigger.click()
  await expect(
    page.locator("[role='listbox'] [data-slot='model-row']").first()
  ).toBeVisible()
  return trigger
}

test("a click at the centre of every row of the Image picker chooses that row's model", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop", "the desktop picker")
  test.setTimeout(240_000)
  await page.addInitScript(() => {
    window.localStorage.setItem("rosesfield.welcome", "seen")
  })
  await page.goto("/apps/image")
  const trigger = await openImagePicker(page)
  const list = page.getByRole("listbox")
  const rows = list.locator("[data-slot='model-row']")
  const count = await rows.count()
  expect(count).toBeGreaterThan(10)
  const missed: string[] = []
  for (let index = 0; index < count; index += 1) {
    if (index > 0) {
      await openImagePicker(page)
    }
    const row = rows.nth(index)
    await row.scrollIntoViewIfNeeded()
    const name =
      (await row.getByRole("option").getAttribute("aria-label")) ?? ""
    const box = await row.boundingBox()
    if (box === null) {
      throw new Error(`the row ${name} has no box`)
    }
    const centre = { x: box.x + box.width / 2, y: box.y + box.height / 2 }
    const isLink = await page.evaluate(
      ({ x, y }) => document.elementFromPoint(x, y)?.closest("a") !== null,
      centre
    )
    if (isLink) {
      missed.push(`${name}: the centre is a link`)
      await page.keyboard.press("Escape")
    } else {
      await page.mouse.click(centre.x, centre.y)
      await expect(trigger).toContainText(name)
    }
    await expect(list).toBeHidden()
  }
  expect(missed).toEqual([])
})

test("on a row with Open weights only the 12 px mark links to the weights page, and a click on the words chooses the model", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop", "the desktop picker")
  await page.addInitScript(() => {
    window.localStorage.setItem("rosesfield.welcome", "seen")
  })
  await page.goto("/apps/image")
  const trigger = await openImagePicker(page)
  const rows = page.locator("[role='listbox'] [data-slot='model-row']", {
    has: page.locator("[data-slot='model-row-weights']"),
  })
  const current = (await trigger.textContent()) ?? ""
  const names = await rows
    .getByRole("option")
    .evaluateAll((options) =>
      options.map((option) => option.getAttribute("aria-label") ?? "")
    )
  const name = names.find((one) => one !== "" && !current.includes(one))
  if (name === undefined) {
    throw new Error("no other row carries Open weights")
  }
  const row = rows
    .filter({ has: page.getByRole("option", { name, exact: true }) })
    .first()
  const badge = row.locator(
    "[data-slot='model-row-weights'] [data-slot='badge']"
  )
  const link = badge.getByRole("link")
  const [nameBox, badgeBox, linkBox, wordsBox] = await Promise.all([
    row.locator("[data-slot='model-row-name']").boundingBox(),
    badge.boundingBox(),
    link.boundingBox(),
    badge.locator("[data-slot='count-badge-words']").boundingBox(),
  ])
  if (
    nameBox === null ||
    badgeBox === null ||
    linkBox === null ||
    wordsBox === null
  ) {
    throw new Error("the row has no box")
  }
  expect(badgeBox.x - (nameBox.x + nameBox.width)).toBeCloseTo(4, 0)
  expect(linkBox.width).toBe(12)
  expect(linkBox.height).toBe(12)
  await expect(link).toHaveAttribute("href", /^https:\/\/huggingface\.co\//)
  expect(await link.getAttribute("aria-label")).toMatch(/^huggingface\.co\//)
  await page.mouse.click(
    wordsBox.x + wordsBox.width / 2,
    wordsBox.y + wordsBox.height / 2
  )
  await expect(trigger).toContainText(name)
})

for (const state of ["open", "with-settings"]) {
  test(`keeps the search in view while the list scrolls on a short screen, ${state}`, async ({
    page,
  }) => {
    await openPicker(page, state)
    const search = page.getByRole("searchbox").first()
    const list = page.getByRole("listbox").first()
    const picker = page.locator('[data-slot="model-picker"]').first()
    const before = await boxOf(search)
    expect(before.top).toBeGreaterThanOrEqual(0)
    expect(before.bottom - before.top).toBeGreaterThan(0)
    expect((await boxOf(picker)).bottom).toBeLessThanOrEqual(shortScreen.height)
    const scroller = list.locator("xpath=..")
    const sizes = await scroller.evaluate((element) => ({
      scroll: element.scrollHeight,
      client: element.clientHeight,
    }))
    expect(sizes.scroll).toBeGreaterThan(sizes.client)
    await scroller.evaluate((element) => {
      element.scrollTop = element.scrollHeight
    })
    expect(
      await scroller.evaluate((element) => element.scrollTop)
    ).toBeGreaterThan(0)
    const after = await boxOf(search)
    expect(after).toEqual(before)
    expect(after.bottom).toBeLessThanOrEqual(shortScreen.height)
  })
}

test("each row of the Image picker draws its lab's mark as path data or its first letter, and shows no picture", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop", "the desktop picker")
  await page.addInitScript(() => {
    window.localStorage.setItem("rosesfield.welcome", "seen")
  })
  await page.goto("/apps/image")
  await openImagePicker(page)
  const list = page.getByRole("listbox")
  const marks = await list
    .locator("[data-slot='model-row-mark'] [data-slot='lab-mark']")
    .evaluateAll((nodes) =>
      nodes.map((node) => ({
        maker: node.getAttribute("data-maker") ?? "",
        mark: node.getAttribute("data-mark") ?? "",
        paths: node.querySelectorAll("svg path").length,
        text: node.textContent ?? "",
        width: node.getBoundingClientRect().width,
      }))
    )
  expect(marks.length).toBeGreaterThan(10)
  for (const one of marks) {
    expect(one.width, one.maker).toBe(16)
    if (one.mark === "letter") {
      expect(one.paths, one.maker).toBe(0)
      expect(one.text, one.maker).toMatch(/^\p{Lu}$|^\p{N}$/u)
    } else {
      expect(one.paths, one.maker).toBe(1)
      expect(one.text, one.maker).toBe("")
    }
  }
  expect(marks.find((one) => one.maker === "Google")?.mark).toBe("google")
  expect(marks.find((one) => one.maker === "Black Forest Labs")?.mark).toBe(
    "letter"
  )
  expect(await list.locator("img, video, picture").count()).toBe(0)
})

test("the Image picker's list fades in while it moves 4 px from its trigger", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop", "the desktop picker")
  await page.addInitScript(() => {
    window.localStorage.setItem("rosesfield.welcome", "seen")
  })
  await page.goto("/apps/image")
  const trigger = page.getByRole("button", { name: /^Model/ }).first()
  await expect(trigger).toBeVisible()
  const frames = await trigger.evaluate(
    (button) =>
      new Promise<{ y: number; opacity: number }[]>((resolve) => {
        const read: { y: number; opacity: number }[] = []
        const sample = (): void => {
          const list = document.querySelector("[data-slot='model-picker']")
          if (list !== null) {
            const style = getComputedStyle(list)
            const y = Number.parseFloat(style.translate.split(" ")[1] ?? "0")
            read.push({
              y: Number.isNaN(y) ? 0 : y,
              opacity: Number(style.opacity),
            })
          }
          if (read.length < 40) {
            requestAnimationFrame(sample)
          } else {
            resolve(read)
          }
        }
        if (button instanceof HTMLElement) {
          button.click()
        }
        requestAnimationFrame(sample)
      })
  )
  const moved = Math.max(...frames.map((frame) => frame.y))
  expect(frames[0]?.opacity).toBeLessThan(1)
  expect(moved).toBeGreaterThan(0)
  expect(moved).toBeLessThanOrEqual(4)
  expect(frames.at(-1)).toEqual({ y: 0, opacity: 1 })
})
