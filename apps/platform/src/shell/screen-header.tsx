import { cn } from "@rosesfield/ui/lib/cn"
import { type ReactElement, type ReactNode, useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { useHeaderSlots } from "@/shell/header-slots"

type ScreenHeaderProps = {
  title: ReactNode
  phoneTitle?: ReactNode
  line?: ReactNode
  actions?: ReactNode
  phoneAction?: ReactNode
  isScrolled?: boolean
}

export function useScrolledPast(): [
  (node: HTMLElement | null) => void,
  boolean,
] {
  const [node, setNode] = useState<HTMLElement | null>(null)
  const [isPast, setPast] = useState(false)
  useEffect(() => {
    if (node === null || typeof IntersectionObserver === "undefined") {
      return
    }
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        setPast(!entry.isIntersecting)
      }
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [node])
  return [setNode, isPast]
}

function PhoneParts({
  title,
  phoneAction,
}: Pick<ScreenHeaderProps, "title" | "phoneAction">): ReactNode {
  const slots = useHeaderSlots()
  return (
    <>
      {slots.title === null ? null : createPortal(title, slots.title)}
      {slots.action === null || phoneAction === undefined
        ? null
        : createPortal(phoneAction, slots.action)}
    </>
  )
}

export function ScreenHeader(props: ScreenHeaderProps): ReactElement {
  const [sentinel, isPast] = useScrolledPast()
  const isScrolled = props.isScrolled ?? isPast
  return (
    <>
      <span ref={sentinel} aria-hidden="true" className="block h-0" />
      {props.title === null ? null : (
        <h1 className="sr-only @regular:hidden">
          {props.phoneTitle ?? props.title}
        </h1>
      )}
      <header
        className={cn(
          "sticky top-0 z-10 hidden h-header shrink-0 items-center gap-s3 bg-canvas px-s4 @regular:flex",
          isScrolled ? "shadow-seam" : ""
        )}
      >
        {props.title === null ? null : (
          <h1 className="min-w-0 shrink truncate text-body font-medium">
            {props.title}
          </h1>
        )}
        {props.line === undefined ? null : (
          <p className="min-w-0 flex-1 truncate text-body text-ink-muted">
            {props.line}
          </p>
        )}
        <div className="ml-auto flex shrink-0 items-center gap-s2">
          {props.actions}
        </div>
      </header>
      <PhoneParts
        title={props.phoneTitle ?? props.title}
        phoneAction={props.phoneAction}
      />
    </>
  )
}
