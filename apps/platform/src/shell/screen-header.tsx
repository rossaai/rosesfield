import { cn } from "@rosesfield/ui/lib/cn"
import { type ReactElement, type ReactNode, useEffect, useState } from "react"

type ScreenHeaderProps = {
  title: ReactNode
  phoneTitle?: ReactNode
  line?: ReactNode
  actions?: ReactNode
  phoneLead?: ReactNode
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

function PhoneHeader({
  title,
  phoneLead,
  phoneAction,
}: Pick<ScreenHeaderProps, "title" | "phoneLead" | "phoneAction">): ReactNode {
  if (title === null && phoneLead === undefined && phoneAction === undefined) {
    return null
  }
  return (
    <header className="flex h-header shrink-0 items-center gap-s3 px-s5 @regular:hidden">
      {phoneLead === undefined ? null : (
        <div className="-ms-s2 flex shrink-0 items-center">{phoneLead}</div>
      )}
      {title === null ? null : (
        <h1 className="min-w-0 flex-1 truncate text-body font-medium">
          {title}
        </h1>
      )}
      {phoneAction === undefined ? null : (
        <div className="ml-auto flex shrink-0 items-center gap-s2">
          {phoneAction}
        </div>
      )}
    </header>
  )
}

export function ScreenHeader(props: ScreenHeaderProps): ReactElement {
  const [sentinel, isPast] = useScrolledPast()
  const isScrolled = props.isScrolled ?? isPast
  return (
    <>
      <span ref={sentinel} aria-hidden="true" className="block h-0" />
      <PhoneHeader
        title={props.phoneTitle ?? props.title}
        {...(props.phoneLead === undefined
          ? {}
          : { phoneLead: props.phoneLead })}
        phoneAction={props.phoneAction}
      />
      <header
        className={cn(
          "sticky top-0 z-10 hidden h-header shrink-0 items-center gap-s3 bg-canvas px-s5 @regular:flex",
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
    </>
  )
}
