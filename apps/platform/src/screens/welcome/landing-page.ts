export function isLandingPage(): boolean {
  return typeof __LANDING_PAGE__ === "boolean" && __LANDING_PAGE__
}
