export function isCut(element: HTMLElement | null): boolean {
  return element !== null && element.scrollWidth > element.clientWidth
}
