import type { Locator } from "@playwright/test"

/** Waits until every finite animation of the element and of its children has finished or been cancelled, so a box read after it is the resting one. */
export async function settled(locator: Locator): Promise<void> {
  await locator.evaluate((element) =>
    Promise.all(
      element
        .getAnimations({ subtree: true })
        .filter(
          (animation) =>
            animation.effect?.getComputedTiming().endTime !==
            Number.POSITIVE_INFINITY
        )
        .map((animation) => animation.finished.catch(() => undefined))
    )
  )
}
