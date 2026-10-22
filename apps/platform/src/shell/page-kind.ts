const appPage = /^\/apps\/([^/]+)/

const inputScreens: readonly RegExp[] = [
  appPage,
  /^\/agent(\/|$)/,
  /^\/characters\/new(\/|$)/,
]

export function appIdOfPath(pathname: string): string | null {
  return appPage.exec(pathname)?.[1] ?? null
}

export function hasInputs(pathname: string): boolean {
  return inputScreens.some((pattern) => pattern.test(pathname))
}

const browsePages: readonly string[] = ["/", "/apps", "/privacy", "/terms"]

export function hasFooter(pathname: string): boolean {
  const path =
    pathname.length > 1 && pathname.endsWith("/")
      ? pathname.slice(0, -1)
      : pathname
  return browsePages.includes(path)
}
