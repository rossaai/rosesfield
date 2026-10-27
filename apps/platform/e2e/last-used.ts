import type { Page } from "@playwright/test"

const storageKey = "rosesfield.app.last-used"

/** Opens each app as a person who last used the model the gateway declares as that app's default, kept in this browser until the page changes it. */
export async function keepDeclaredModels(
  page: Page,
  appIds: readonly string[]
): Promise<void> {
  const kept: Record<
    string,
    { model: string; settings: Record<string, never> }
  > = {}
  for (const appId of appIds) {
    const response = await page.request.get(`/api/apps/${appId}/models`)
    const body: { defaultModel?: unknown } = await response.json()
    if (typeof body.defaultModel === "string") {
      kept[appId] = { model: body.defaultModel, settings: {} }
    }
  }
  await page.addInitScript(
    ([key, value]) => {
      if (window.localStorage.getItem(key) === null) {
        window.localStorage.setItem(key, value)
      }
    },
    [storageKey, JSON.stringify(kept)] as const
  )
}
