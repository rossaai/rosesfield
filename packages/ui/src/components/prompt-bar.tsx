import { IconButton } from "@rosesfield/ui/components/button"
import { GenerateButton } from "@rosesfield/ui/components/generate-button"
import { useAutoGrow } from "@rosesfield/ui/hooks/use-auto-grow"
import { cn } from "@rosesfield/ui/lib/cn"
import { XIcon } from "lucide-react"
import {
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  useRef,
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
  "block max-h-[20dvh] min-h-10 w-full resize-none field-sizing-content overflow-y-auto bg-transparent px-1 py-2.5 text-body text-ink outline-none placeholder:text-ink-muted"

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

function ChipRow({ leading, chips }: PromptBarProps): ReactElement {
  return (
    <div
      data-slot="composer-toolbar"
      className="flex h-8 min-w-0 items-center gap-1"
    >
      {leading}
      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto [scrollbar-width:none]">
        {chips}
      </div>
    </div>
  )
}

function PromptField({
  props,
  onSubmit,
}: {
  props: PromptBarProps
  onSubmit: () => void
}): ReactElement {
  const field = useRef<HTMLTextAreaElement>(null)
  useAutoGrow(field)
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (isSubmitKey(event)) {
      event.preventDefault()
      onSubmit()
    }
  }
  return (
    <div data-slot="composer-prompt" className="flex min-h-12 items-start">
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
