import { interaction } from "@rosesfield/ui/components/interaction"
import { cn } from "@rosesfield/ui/lib/cn"
import { motion } from "@rosesfield/ui/motion"
import {
  type CSSProperties,
  type ReactElement,
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"

type ConfirmButtonProps = {
  icon: ReactNode
  label: string
  onConfirm: () => void
  disabled?: boolean
  busy?: boolean
  className?: string
}

type Arming = { isArmed: boolean; width: number | null }

const rest: Arming = { isArmed: false, width: null }

function useReturnToRest(
  host: { current: HTMLElement | null },
  isArmed: boolean,
  disarm: () => void
): void {
  useEffect(() => {
    if (!isArmed) {
      return
    }
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        disarm()
      }
    }
    const onPress = (event: PointerEvent): void => {
      if (
        !(event.target instanceof Node && host.current?.contains(event.target))
      ) {
        disarm()
      }
    }
    const onFocus = (event: FocusEvent): void => {
      if (
        !(event.target instanceof Node && host.current?.contains(event.target))
      ) {
        disarm()
      }
    }
    document.addEventListener("keydown", onKey)
    document.addEventListener("pointerdown", onPress, true)
    document.addEventListener("focusin", onFocus)
    window.addEventListener("scroll", disarm, true)
    return () => {
      document.removeEventListener("keydown", onKey)
      document.removeEventListener("pointerdown", onPress, true)
      document.removeEventListener("focusin", onFocus)
      window.removeEventListener("scroll", disarm, true)
    }
  }, [host, isArmed, disarm])
}

function ConfirmFaces({
  icon,
  label,
  words,
}: {
  icon: ReactNode
  label: string
  words: RefObject<HTMLSpanElement | null>
}): ReactElement {
  return (
    <>
      <span
        aria-hidden="true"
        data-slot="confirm-button-glyph"
        className={cn(
          "absolute inset-y-0 start-0 flex w-(--confirm) items-center justify-center group-data-[armed=yes]/confirm:scale-(--scale-enter) group-data-[armed=yes]/confirm:opacity-0 [&_svg]:glyph",
          motion.swap
        )}
      >
        {icon}
      </span>
      <span
        ref={words}
        aria-hidden="true"
        data-slot="confirm-button-label"
        className={cn(
          "flex max-w-button-max shrink-0 items-center px-s5 opacity-0 group-data-[armed=yes]/confirm:opacity-100",
          motion.swap
        )}
      >
        {label}
      </span>
    </>
  )
}

function ConfirmButton({
  icon,
  label,
  onConfirm,
  disabled = false,
  busy = false,
  className,
}: ConfirmButtonProps): ReactElement {
  const [arming, setArming] = useState<Arming>(rest)
  const host = useRef<HTMLSpanElement>(null)
  const words = useRef<HTMLSpanElement>(null)
  const disarm = useCallback(() => setArming(rest), [])
  useReturnToRest(host, arming.isArmed, disarm)
  const press = (): void => {
    if (busy) {
      return
    }
    if (arming.isArmed) {
      setArming(rest)
      onConfirm()
      return
    }
    setArming({ isArmed: true, width: words.current?.scrollWidth ?? null })
  }
  const style: CSSProperties | undefined =
    arming.isArmed && arming.width !== null
      ? { width: `${arming.width}px` }
      : undefined
  return (
    <span
      ref={host}
      data-slot="confirm-button"
      data-armed={arming.isArmed ? "yes" : "no"}
      style={style}
      className={cn(
        "relative inline-flex h-(--confirm) w-(--confirm) shrink-0 overflow-hidden rounded-full [--confirm:var(--spacing-icon)] in-data-[density=composer]:[--confirm:var(--spacing-icon-dense)] in-data-[density=row]:[--confirm:var(--spacing-icon-small)]",
        motion.yield,
        className
      )}
    >
      <button
        type="button"
        aria-label={label}
        aria-busy={busy || undefined}
        data-armed={arming.isArmed ? "yes" : "no"}
        disabled={disabled}
        onClick={press}
        className={cn(
          "group/confirm relative flex size-full items-center rounded-full bg-transparent font-medium text-body whitespace-nowrap text-bug-text hover:bg-(--tint) disabled:opacity-(--opacity-disabled) data-[armed=yes]:bg-bug-tint",
          motion.pressRound,
          interaction.ring
        )}
      >
        <ConfirmFaces icon={icon} label={label} words={words} />
      </button>
    </span>
  )
}

export type { ConfirmButtonProps }
export { ConfirmButton }
