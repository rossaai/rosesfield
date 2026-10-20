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

export function hasFooter(pathname: string): boolean {
  return !hasInputs(pathname)
}
