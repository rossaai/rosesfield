import { interaction } from "@rosesfield/ui/components/interaction"
import { edgeMaskOf, useScrollEnds } from "@rosesfield/ui/hooks/use-scroll-ends"
import { cn } from "@rosesfield/ui/lib/cn"
import { motion, prefersReducedMotion } from "@rosesfield/ui/motion"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import {
  type ComponentProps,
  type ReactElement,
  type ReactNode,
  useRef,
} from "react"

type ComposerProps = ComponentProps<"div"> & {
  floating?: boolean
}

function Composer({
  floating = false,
  className,
  ...props
}: ComposerProps): ReactElement {
  return (
    <div
      data-slot="composer"
      data-ground="surface"
      data-density="composer"
      data-floating={floating ? "yes" : "no"}
      className={cn(
        "flex w-full min-w-0 flex-col gap-s2 rounded-vessel bg-surface p-s3 text-ink",
        floating ? "shadow-float" : "",
        motion.tint,
        className
      )}
      {...props}
    />
  )
}

function ComposerToolbar({
  className,
  ...props
}: ComponentProps<"div">): ReactElement {
  return (
    <div
      data-slot="composer-toolbar"
      className={cn("flex min-w-0 items-center gap-s2", className)}
      {...props}
    />
  )
}

const chipFade = "var(--spacing-s8)"

function ChipArrow({
  end,
  isShown,
  onPress,
}: {
  end: "start" | "end"
  isShown: boolean
  onPress: () => void
}): ReactElement {
  return (
    <button
      type="button"
      tabIndex={-1}
      aria-hidden="true"
      data-slot="chip-row-arrow"
      data-end={end}
      onClick={onPress}
      className={cn(
        "absolute top-1/2 z-10 hidden size-icon-small -translate-y-1/2 items-center justify-center rounded-full bg-(--well) text-ink-muted hover:text-ink @regular:flex [&_svg]:glyph-small",
        end === "start" ? "start-0" : "end-0",
        isShown ? "opacity-100" : "pointer-events-none opacity-0",
        motion.tint
      )}
    >
      {end === "start" ? <ChevronLeftIcon /> : <ChevronRightIcon />}
    </button>
  )
}

function ComposerChips({ children }: { children: ReactNode }): ReactElement {
  const row = useRef<HTMLDivElement>(null)
  const { ends, update } = useScrollEnds(row)
  const move = (direction: 1 | -1): void => {
    const element = row.current
    element?.scrollBy({
      left: (direction * element.clientWidth) / 2,
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    })
  }
  return (
    <div className="relative flex min-w-0 flex-1">
      <ChipArrow end="start" isShown={ends.start} onPress={() => move(-1)} />
      <div
        ref={row}
        data-slot="chip-row"
        data-scroll-start={ends.start ? "yes" : "no"}
        data-scroll-end={ends.end ? "yes" : "no"}
        onScroll={update}
        style={edgeMaskOf(ends, chipFade)}
        className={cn(
          "flex min-w-0 flex-1 items-center gap-s1 overflow-x-auto [scrollbar-width:none] *:shrink-0 [&::-webkit-scrollbar]:hidden",
          interaction.ringRoom
        )}
      >
        {children}
      </div>
      <ChipArrow end="end" isShown={ends.end} onPress={() => move(1)} />
    </div>
  )
}

export type { ComposerProps }
export { Composer, ComposerChips, ComposerToolbar }
