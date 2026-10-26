import { expect, type Locator, type Page, test } from "@playwright/test"

const shortScreen = { width: 390, height: 420 }

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
  await page
    .locator("[data-slot='model-picker']")
    .evaluate((element) =>
      Promise.all(
        element.getAnimations().map((animation) => animation.finished)
      )
    )
  return trigger
}

test("a click at the centre of every row of the Image picker, or on its lab's mark when the Open weights badge that links out sits there, chooses that row's model", async ({
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
      (await row.locator("[data-slot='model-row-name']").textContent()) ?? ""
    const box = await row.boundingBox()
    if (box === null) {
      throw new Error(`the row ${name} has no box`)
    }
    const middle = { x: box.x + box.width / 2, y: box.y + box.height / 2 }
    const mark = row.locator("[data-slot='model-row-weights'] a")
    const weights = (await mark.count()) === 0 ? null : await mark.boundingBox()
    const isOnWeights =
      weights !== null &&
      middle.x >= weights.x &&
      middle.x <= weights.x + weights.width
    const centre = isOnWeights
      ? { x: box.x + box.height / 2, y: middle.y }
      : middle
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

async function otherWeightsRow(
  page: Page,
  trigger: Locator
): Promise<{ name: string; row: Locator }> {
  const rows = page.locator("[role='listbox'] [data-slot='model-row']", {
    has: page.locator("[data-slot='model-row-weights']"),
  })
  const current = (await trigger.textContent()) ?? ""
  const names = await rows
    .locator("[data-slot='model-row-name']")
    .allTextContents()
  const name = names.find((one) => one !== "" && !current.includes(one))
  if (name === undefined) {
    throw new Error("no other row carries Open weights")
  }
  const row = rows
    .filter({
      has: page
        .locator("[data-slot='model-row-name']")
        .getByText(name, { exact: true }),
    })
    .first()
  return { name, row }
}

test("on a row with Open weights the whole badge opens the weights page in a new tab without choosing the model, and a click on the name chooses it", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop", "the desktop picker")
  await page.addInitScript(() => {
    window.localStorage.setItem("rosesfield.welcome", "seen")
  })
  await page.goto("/apps/image")
  const trigger = await openImagePicker(page)
  const { name, row } = await otherWeightsRow(page, trigger)
  await row.scrollIntoViewIfNeeded()
  const link = row.locator("[data-slot='model-row-weights'] a")
  await expect(link).toHaveAttribute("data-slot", "badge")
  await expect(link).toHaveAttribute("href", /^https:\/\/huggingface\.co\//)
  await expect(link).toHaveAttribute("target", "_blank")
  await expect(link).toHaveAccessibleName("Open weights")
  const [nameBox, linkBox, wordsBox] = await Promise.all([
    row.locator("[data-slot='model-row-name']").boundingBox(),
    link.boundingBox(),
    link.locator("[data-slot='count-badge-words']").boundingBox(),
  ])
  if (nameBox === null || linkBox === null || wordsBox === null) {
    throw new Error("the row has no box")
  }
  const hit = await page.evaluate(
    ({ x, y }) => document.elementFromPoint(x, y)?.closest("a")?.dataset.slot,
    { x: wordsBox.x + wordsBox.width / 2, y: wordsBox.y + wordsBox.height / 2 }
  )
  expect(hit).toBe("badge")
  await page
    .context()
    .route("https://huggingface.co/**", (route) =>
      route.fulfill({ status: 200, contentType: "text/html", body: "" })
    )
  const popup = page.waitForEvent("popup")
  await page.mouse.click(
    wordsBox.x + wordsBox.width / 2,
    wordsBox.y + wordsBox.height / 2
  )
  const opened = await popup
  expect(opened.url()).toMatch(/^https:\/\/huggingface\.co\//)
  await opened.close()
  await expect(trigger).not.toContainText(name)
  await page.mouse.click(nameBox.x + 4, nameBox.y + nameBox.height / 2)
  await expect(trigger).toContainText(name)
})

test("keeps the search in view while the list scrolls on a short screen", async ({
  page,
}) => {
  await openPicker(page, "open")
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

test("each row of the Image picker draws its lab's mark as path data or its first letter on its brand colour, and shows no picture", async ({
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
        ground: getComputedStyle(node).backgroundColor,
      }))
    )
  expect(marks.length).toBeGreaterThan(10)
  for (const one of marks) {
    expect(one.width, one.maker).toBe(16)
    if (one.mark === "letter") {
      expect(one.paths, one.maker).toBe(0)
      expect(one.text, one.maker).toMatch(/^\p{Lu}$|^\p{N}$/u)
      const [red, green, blue] = (one.ground.match(/\d+/g) ?? []).map(Number)
      expect({
        maker: one.maker,
        grey: red === green && green === blue,
      }).toEqual({ maker: one.maker, grey: false })
    } else {
      expect(one.paths, one.maker).toBeGreaterThanOrEqual(1)
      expect(one.paths, one.maker).toBeLessThanOrEqual(2)
      expect(one.text, one.maker).toBe("")
    }
  }
  expect(marks.find((one) => one.maker === "Google")?.mark).toBe("google")
  expect(marks.find((one) => one.maker === "Black Forest Labs")?.mark).toBe(
    "bfl"
  )
  expect(marks.find((one) => one.maker === "Beeble")?.mark).toBe("beeble")
  expect(await list.locator("img, video, picture").count()).toBe(0)
})

test("the Image picker's list fades in while it grows from 0.94 to its size on the popover preset", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop", "the desktop picker")
  await page.addInitScript(() => {
    window.localStorage.setItem("rosesfield.welcome", "seen")
  })
  await page.goto("/apps/image")
  const trigger = page.getByRole("button", { name: /^Model/ }).first()
  await expect(trigger).toBeVisible()
  await page.evaluate(() => {
    const frames: { scale: number; opacity: number }[] = []
    Object.assign(window, { pickerFrames: frames })
    const sample = (): void => {
      const list = document.querySelector("[data-slot='model-picker']")
      if (list !== null) {
        const matrix = new DOMMatrix(getComputedStyle(list).transform)
        frames.push({
          scale: Math.round(matrix.a * 1000) / 1000,
          opacity: Number(getComputedStyle(list).opacity),
        })
      }
      if (frames.length < 40) {
        requestAnimationFrame(sample)
      }
    }
    requestAnimationFrame(sample)
  })
  await trigger.click()
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { pickerFrames: unknown[] }).pickerFrames.length
      )
    )
    .toBe(40)
  const frames = await page.evaluate(
    () =>
      (
        window as unknown as {
          pickerFrames: { scale: number; opacity: number }[]
        }
      ).pickerFrames
  )
  const scales = frames.map((frame) => frame.scale)
  expect(frames[0]?.opacity).toBeLessThan(1)
  expect(Math.min(...scales)).toBe(0.94)
  expect(scales.some((scale) => scale > 0.94 && scale < 1)).toBe(true)
  expect(frames.at(-1)).toEqual({ scale: 1, opacity: 1 })
})

async function expectToolbar(page: Page): Promise<Locator> {
  const toolbar = page.locator("[data-slot='model-picker-toolbar']")
  await expect(toolbar.getByRole("tab")).toHaveCount(0)
  await expect(toolbar.getByRole("searchbox")).toHaveCount(1)
  await expect(toolbar.getByRole("button")).toHaveCount(1)
  const filter = toolbar.getByRole("button", { name: "Sort and filter" })
  const [bar, search, button] = await Promise.all([
    toolbar.boundingBox(),
    toolbar.getByRole("searchbox").boundingBox(),
    filter.boundingBox(),
  ])
  if (bar === null || search === null || button === null) {
    throw new Error("the toolbar has no box")
  }
  const above = search.y - bar.y
  const below = bar.y + bar.height - search.y - search.height
  expect(Math.abs(above - below)).toBeLessThanOrEqual(1)
  expect(button.height).toBe(search.height)
  expect(button.x).toBeGreaterThan(search.x + search.width)
  expect(
    await toolbar.evaluate((node) => getComputedStyle(node).borderBottomWidth)
  ).toBe("0px")
  return filter
}

async function boxesOf(row: Locator) {
  const rank = row.locator("[data-slot='model-row-rank']")
  const [mark, name, rankBox] = await Promise.all([
    row.locator("[data-slot='model-row-mark']").boundingBox(),
    row.locator("[data-slot='model-row-name']").boundingBox(),
    (await rank.count()) === 0 ? null : rank.boundingBox(),
  ])
  return { mark, name, rank: rankBox }
}

async function expectRankOnMark(page: Page, rows: Locator): Promise<void> {
  const rank = page.locator("[data-slot='model-row-rank']")
  const ranked = rows.filter({ has: rank })
  const plain = rows.filter({ hasNot: rank })
  await expect(
    ranked.first().locator("[data-slot='model-row-rank']")
  ).toHaveText("1")
  const first = await boxesOf(ranked.first())
  const last = await boxesOf(plain.last())
  if (first.mark === null || first.name === null || first.rank === null) {
    throw new Error("the ranked row has no box")
  }
  expect(first.mark.width).toBe(last.mark?.width)
  expect(first.mark.x).toBe(last.mark?.x)
  expect(first.name.x).toBe(last.name?.x)
  const markEnd = first.mark.x + first.mark.width
  expect(first.rank.x + first.rank.width).toBeGreaterThan(markEnd)
  expect(first.rank.x).toBeLessThan(markEnd)
  expect(first.rank.y).toBeLessThan(first.mark.y)
  expect(first.rank.x + first.rank.width).toBeLessThanOrEqual(first.name.x)
}

test("the Image picker's toolbar holds the search and one filter button that opens Sort by, Order and the Open weights only switch, their icons on one inset, and each rank sits on its mark's corner without moving the name", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop", "the desktop picker")
  await page.addInitScript(() => {
    window.localStorage.setItem("rosesfield.welcome", "seen")
  })
  await page.goto("/apps/image")
  await openImagePicker(page)
  const filter = await expectToolbar(page)
  const rows = page.locator(
    "[role='listbox'] [data-section='all'] [data-slot='model-row']"
  )
  await expectRankOnMark(page, rows)
  await filter.click()
  const menu = page.locator("[data-slot='view-menu-content']").first()
  const sorts = menu.locator("[data-slot='dropdown-menu-sub-trigger']")
  await expect(sorts).toHaveText(["Sort byRank", "OrderHigh to low"])
  const open = menu.getByRole("menuitemcheckbox", { name: "Open weights only" })
  const leads = [
    sorts.nth(0).locator("[data-slot='dropdown-menu-lead']"),
    sorts.nth(1).locator("[data-slot='dropdown-menu-lead']"),
    open.locator("[data-slot='dropdown-menu-lead']"),
  ]
  const boxes = await Promise.all(leads.map((lead) => lead.boundingBox()))
  for (const box of boxes) {
    expect(box?.width).toBeGreaterThan(0)
    expect(box?.x).toBe(boxes[0]?.x)
    expect(box?.width).toBe(boxes[0]?.width)
  }
  await sorts.nth(0).hover()
  const sub = page.locator("[data-slot='dropdown-menu-content']").last()
  await expect(sub.getByRole("menuitemradio")).toHaveText(["Rank", "Price"])
  await expect(
    sub.getByRole("menuitemradio", { name: "Rank" })
  ).toHaveAttribute("aria-checked", "true")
  const order = await sorts.nth(1).boundingBox()
  if (order === null) {
    throw new Error("the Order row has no box")
  }
  await page.mouse.move(order.x + order.width / 2, order.y + order.height / 2, {
    steps: 8,
  })
  await expect(sorts.nth(1)).toHaveAttribute("aria-expanded", "true")
  const orders = page.locator("[data-slot='dropdown-menu-content']").last()
  await expect(orders.getByRole("menuitemradio")).toHaveText([
    "High to low",
    "Low to high",
  ])
  await expect(
    orders.getByRole("menuitemradio", { name: "High to low" })
  ).toHaveAttribute("aria-checked", "true")
  const sw = await open.boundingBox()
  if (sw === null) {
    throw new Error("the switch row has no box")
  }
  await page.mouse.move(sw.x + sw.width / 4, sw.y + sw.height / 2, {
    steps: 8,
  })
  await expect(sorts.nth(1)).toHaveAttribute("aria-expanded", "false")
  await open.click()
  expect(await rows.count()).toBeGreaterThan(0)
  for (const row of await rows.all()) {
    await expect(row.locator("[data-slot='model-row-weights']")).toHaveCount(1)
  }
})
