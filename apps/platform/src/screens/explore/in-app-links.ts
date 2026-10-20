import { useRouter } from "@tanstack/react-router"
import { type RefObject, useEffect, useRef } from "react"

export type LinkClick = {
  defaultPrevented: boolean
  button: number
  metaKey: boolean
  ctrlKey: boolean
  shiftKey: boolean
  altKey: boolean
  target: EventTarget | null
}

function isPlainClick(click: LinkClick): boolean {
  return (
    !click.defaultPrevented &&
    click.button === 0 &&
    !click.metaKey &&
    !click.ctrlKey &&
    !click.shiftKey &&
    !click.altKey
  )
}

export function inAppPathOf(click: LinkClick, origin: string): string | null {
  if (!isPlainClick(click) || !(click.target instanceof Element)) {
    return null
  }
  const anchor = click.target.closest("a[href]")
  if (
    !(anchor instanceof HTMLAnchorElement) ||
    anchor.target !== "" ||
    anchor.hasAttribute("download")
  ) {
    return null
  }
  const url = new URL(anchor.href, origin)
  return url.origin === origin
    ? `${url.pathname}${url.search}${url.hash}`
    : null
}

export function useInAppLinks<Root extends HTMLElement>(): RefObject<
  Root | null
> {
  const router = useRouter()
  const root = useRef<Root>(null)
  useEffect(() => {
    const element = root.current
    if (element === null) {
      return
    }
    const follow = (event: MouseEvent): void => {
      const path = inAppPathOf(event, window.location.origin)
      if (path !== null) {
        event.preventDefault()
        router.history.push(path)
      }
    }
    element.addEventListener("click", follow)
    return () => element.removeEventListener("click", follow)
  }, [router])
  return root
}
