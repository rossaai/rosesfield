import { cn } from "@rosesfield/ui/lib/cn"
import {
  createContext,
  type ReactElement,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react"
import { createPortal } from "react-dom"
import { useIsRegularWindow } from "@/pieces/use-is-regular"

type ScreenHeaderProps = {
  title: ReactNode
  phoneTitle?: ReactNode
  line?: ReactNode
  actions?: ReactNode
  phoneLead?: ReactNode
  phoneAction?: ReactNode
  isScrolled?: boolean
}

type PhoneTitleSlot = {
  node: HTMLElement | null
  setNode: (node: HTMLElement | null) => void
  titles: number
  claim: () => () => void
}

const PhoneTitleContext = createContext<PhoneTitleSlot>({
  node: null,
  setNode: () => undefined,
  titles: 0,
  claim: () => () => undefined,
})

export function PhoneTitleProvider({
  children,
}: {
  children: ReactNode
}): ReactElement {
  const [node, setNode] = useState<HTMLElement | null>(null)
  const [titles, setTitles] = useState(0)
  const claim = useCallback(() => {
    setTitles((count) => count + 1)
    return () => setTitles((count) => count - 1)
  }, [])
  const slot = useMemo<PhoneTitleSlot>(
    () => ({ node, setNode, titles, claim }),
    [node, titles, claim]
  )
  return <PhoneTitleContext value={slot}>{children}</PhoneTitleContext>
}

export function usePhoneTitleSlot(): PhoneTitleSlot {
  return use(PhoneTitleContext)
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

export function PhoneTitle({
  title,
  phoneLead,
  phoneAction,
}: Pick<
  ScreenHeaderProps,
  "title" | "phoneLead" | "phoneAction"
>): ReactElement {
  return (
    <span data-slot="phone-title" className="flex min-w-0 items-center gap-s2">
      {phoneLead === undefined ? null : (
        <span className="-ms-s2 flex shrink-0 items-center">{phoneLead}</span>
      )}
      {title === null ? null : (
        <h1 className="min-w-0 truncate font-medium text-body">{title}</h1>
      )}
      {phoneAction === undefined ? null : (
        <span className="flex shrink-0 items-center gap-s1">{phoneAction}</span>
      )}
    </span>
  )
}

function PhoneTitlePortal(
  props: Pick<ScreenHeaderProps, "title" | "phoneLead" | "phoneAction">
): ReactNode {
  const { node, claim } = usePhoneTitleSlot()
  const isRegular = useIsRegularWindow()
  const isEmpty =
    props.title === null &&
    props.phoneLead === undefined &&
    props.phoneAction === undefined
  const isShown = !(isEmpty || isRegular)
  useLayoutEffect(() => (isShown ? claim() : undefined), [isShown, claim])
  if (!isShown || node === null) {
    return null
  }
  return createPortal(<PhoneTitle {...props} />, node)
}

export function ScreenHeader(props: ScreenHeaderProps): ReactElement {
  const isSticky = props.isScrolled !== undefined
  return (
    <>
      <PhoneTitlePortal
        title={props.phoneTitle ?? props.title}
        {...(props.phoneLead === undefined
          ? {}
          : { phoneLead: props.phoneLead })}
        {...(props.phoneAction === undefined
          ? {}
          : { phoneAction: props.phoneAction })}
      />
      <header
        data-slot="screen-header"
        className={cn(
          "z-10 hidden min-h-header shrink-0 items-center gap-s3 bg-canvas px-s5 py-s2 @regular:flex",
          isSticky ? "sticky top-0" : "",
          props.isScrolled === true ? "shadow-seam" : ""
        )}
      >
        {props.title === null ? null : (
          <h1 className="min-w-0 shrink truncate text-display text-ink">
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
