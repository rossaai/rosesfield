import type { APIResponse, Page } from "@playwright/test"

type Listed = { id: string }

type ListPage = { runs?: Listed[]; assets?: Listed[] }

const disposed = /Response has been disposed/

async function readList(response: APIResponse): Promise<ListPage | null> {
  try {
    return await response.json()
  } catch (error) {
    if (error instanceof Error && disposed.test(error.message)) {
      return null
    }
    throw error
  }
}

export async function answerOwnLists(
  page: Page,
  own: ReadonlySet<string>
): Promise<void> {
  await page.route(
    (url) => url.pathname === "/api/runs" || url.pathname === "/api/assets",
    async (route) => {
      if (route.request().method() !== "GET") {
        await route.fallback()
        return
      }
      const response = await route.fetch()
      const listed = await readList(response)
      if (listed === null) {
        return
      }
      const keep = (items: Listed[] | undefined): Listed[] =>
        (items ?? []).filter((item) => own.has(item.id))
      const isRuns = new URL(route.request().url()).pathname === "/api/runs"
      const json = isRuns
        ? { runs: keep(listed.runs), next: null }
        : { assets: keep(listed.assets), next: null }
      await route.fulfill({ response, json })
    }
  )
}
