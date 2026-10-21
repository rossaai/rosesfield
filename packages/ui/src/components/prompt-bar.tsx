import { IconButton } from "@rosesfield/ui/components/button"
import { GenerateButton } from "@rosesfield/ui/components/generate-button"
import { interaction } from "@rosesfield/ui/components/interaction"
import { cn } from "@rosesfield/ui/lib/cn"
import { ChevronLeftIcon, ChevronRightIcon, XIcon } from "lucide-react"
import {
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react"

type PromptAttachment = {
  id: string
  src: string
  alt: string
  caption?: string
}

type PromptBarProps = {
  value: string
  onValueChange: (value: string) => void
  onSubmit: () => void
  label: string
  placeholder: string
  submitLabel: string
  removeLabel: string
  attachments?: ReadonlyArray<PromptAttachment>
  onRemoveAttachment?: (id: string) => void
  leading?: ReactNode
  chips?: ReactNode
  tray?: ReactNode
  notices?: ReactNode
  price?: ReactNode
  submitValue?: ReactNode
  submitName?: string | undefined
  busy?: boolean
  placement?: "inline" | "dock"
  className?: string
}

const fieldClass =
  "block max-h-[20dvh] min-h-10 w-full resize-none overflow-y-auto bg-transparent px-1 py-2.5 text-body text-ink outline-none [transition:height_var(--control-change)] placeholder:text-ink-muted"

const placements = {
  inline: "w-full max-w-220",
  dock: "fixed inset-x-4 bottom-4 z-40 mx-auto max-w-220",
} satisfies Record<NonNullable<PromptBarProps["placement"]>, string>

function AttachmentThumb({
  attachment,
  removeLabel,
  onRemove,
}: {
  attachment: PromptAttachment
  removeLabel: string
  onRemove?: ((id: string) => void) | undefined
}): ReactElement {
  return (
    <li className="relative flex shrink-0 flex-col gap-s1">
      <img
        src={attachment.src}
        alt={attachment.alt}
        className="size-thumb rounded-dense bg-(--tint) object-cover"
      />
      {attachment.caption === undefined ? null : (
        <span className="max-w-thumb truncate text-caption text-ink-muted">
          {attachment.caption}
        </span>
      )}
      {onRemove === undefined ? null : (
        <IconButton
          label={removeLabel}
          size="badge"
          tone="glass"
          className="absolute top-s1 right-s1"
          onClick={() => onRemove(attachment.id)}
        >
          <XIcon aria-hidden="true" />
        </IconButton>
      )}
    </li>
  )
}

function isSubmitKey(event: KeyboardEvent<HTMLTextAreaElement>): boolean {
  return (
    event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing
  )
}

function PromptTray({
  attachments,
  removeLabel,
  onRemoveAttachment,
}: PromptBarProps): ReactNode {
  if (attachments === undefined || attachments.length === 0) {
    return null
  }
  return (
    <ul
      data-slot="composer-attachments"
      className="flex gap-s2 overflow-x-auto"
    >
      {attachments.map((attachment) => (
        <AttachmentThumb
          key={attachment.id}
          attachment={attachment}
          removeLabel={removeLabel}
          onRemove={onRemoveAttachment}
        />
      ))}
    </ul>
  )
}

type Ends = { back: boolean; forward: boolean }

function readEnds(element: HTMLElement): Ends {
  return {
    back: element.scrollLeft > 0,
    forward: element.scrollLeft + element.clientWidth < element.scrollWidth - 1,
  }
}

function useScrollEnds(row: RefObject<HTMLDivElement | null>): {
  ends: Ends
  update: () => void
} {
  const [ends, setEnds] = useState<Ends>({ back: false, forward: false })
  const update = useCallback(() => {
    if (row.current !== null) {
      setEnds(readEnds(row.current))
    }
  }, [row])
  useEffect(() => {
    const element = row.current
    if (element === null || typeof ResizeObserver === "undefined") {
      return
    }
    const sizes = new ResizeObserver(update)
    sizes.observe(element)
    for (const child of element.children) {
      sizes.observe(child)
    }
    return () => sizes.disconnect()
  }, [row, update])
  return { ends, update }
}

function ScrollArrow({
  end,
  isShown,
  onPress,
}: {
  end: keyof Ends
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
        "absolute top-0.5 z-10 flex size-7 items-center justify-center rounded-dense bg-surface text-ink-muted transition-opacity duration-(--duration-control) hover:text-ink [&_svg]:size-4",
        end === "back" ? "left-0" : "right-0",
        isShown ? "opacity-100" : "pointer-events-none opacity-0"
      )}
    >
      {end === "back" ? <ChevronLeftIcon /> : <ChevronRightIcon />}
    </button>
  )
}

function ChipScroller({ chips }: { chips: ReactNode }): ReactElement {
  const row = useRef<HTMLDivElement>(null)
  const { ends, update } = useScrollEnds(row)
  const move = (direction: 1 | -1): void => {
    const element = row.current
    element?.scrollBy({
      left: direction * element.clientWidth,
      behavior: "smooth",
    })
  }
  return (
    <div className="relative flex min-w-0 flex-1">
      <ScrollArrow end="back" isShown={ends.back} onPress={() => move(-1)} />
      <div
        ref={row}
        data-slot="chip-row"
        onScroll={update}
        className={cn(
          "flex min-w-0 flex-1 items-center gap-1 overflow-x-auto [scrollbar-width:none]",
          interaction.ringRoom
        )}
      >
        {chips}
      </div>
      <ScrollArrow
        end="forward"
        isShown={ends.forward}
        onPress={() => move(1)}
      />
    </div>
  )
}

function ChipRow({ leading, chips }: PromptBarProps): ReactElement {
  return (
    <div
      data-slot="composer-toolbar"
      className="flex h-8 min-w-0 items-center gap-1"
    >
      {leading}
      {chips === undefined ? null : <ChipScroller chips={chips} />}
    </div>
  )
}

function useGrowingField(
  field: RefObject<HTMLTextAreaElement | null>,
  value: string
): void {
  useLayoutEffect(() => {
    const element = field.current
    if (element === null || element.value !== value) {
      return
    }
    const from = element.style.height
    element.style.height = "auto"
    const to = `${element.scrollHeight}px`
    element.style.height = from === "" ? to : from
    if (from !== "" && from !== to) {
      void element.offsetHeight
      element.style.height = to
    }
  }, [field, value])
}

function PromptField({
  props,
  onSubmit,
}: {
  props: PromptBarProps
  onSubmit: () => void
}): ReactElement {
  const field = useRef<HTMLTextAreaElement>(null)
  useGrowingField(field, props.value)
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (isSubmitKey(event)) {
      event.preventDefault()
      onSubmit()
    }
  }
  return (
    <div
      data-slot="composer-prompt"
      className={cn(
        "flex min-h-12 items-start rounded-cell",
        interaction.fieldHostRing
      )}
    >
      <textarea
        ref={field}
        rows={1}
        aria-label={props.label}
        placeholder={props.placeholder}
        value={props.value}
        onChange={(event) => props.onValueChange(event.target.value)}
        onKeyDown={onKeyDown}
        className={fieldClass}
      />
    </div>
  )
}

function PromptBar(props: PromptBarProps): ReactElement {
  const busy = props.busy === true
  const submit = (): void => {
    if (!busy) {
      props.onSubmit()
    }
  }
  return (
    <div
      data-slot="prompt-bar"
      data-placement={props.placement ?? "inline"}
      className={cn(
        "rounded-vessel bg-surface-2 p-1",
        placements[props.placement ?? "inline"],
        props.className
      )}
    >
      {props.tray === undefined ? null : (
        <div data-slot="composer-tray" className="px-3 pt-2 pb-3">
          {props.tray}
        </div>
      )}
      <div
        data-ground="surface"
        className="flex items-end gap-3 rounded-card bg-surface p-3"
      >
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <PromptTray {...props} />
          <PromptField props={props} onSubmit={submit} />
          {props.notices === undefined ? null : (
            <div data-slot="composer-notices">{props.notices}</div>
          )}
          <ChipRow {...props} />
        </div>
        <GenerateButton
          form="tile"
          label={props.submitLabel}
          price={props.submitValue ?? props.price}
          busy={busy}
          onClick={submit}
          aria-label={props.submitName}
        />
      </div>
    </div>
  )
}

export type { PromptAttachment, PromptBarProps }
export { PromptBar }
