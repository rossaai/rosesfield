import { Button, IconButton } from "@rosesfield/ui/components/button"
import { growClass } from "@rosesfield/ui/components/textarea"
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
  price?: ReactNode
  submitValue?: ReactNode
  submitName?: string | undefined
  busy?: boolean
  className?: string
}

const fieldClass = cn(
  growClass,
  "w-full bg-transparent px-s1_5 text-body text-ink outline-none placeholder:text-ink-muted"
)

const thumbRadius = "rounded-[calc(var(--radius-vessel)-var(--spacing-s3))]"

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
        className={cn("size-thumb bg-(--tint) object-cover", thumbRadius)}
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
          className="material absolute top-s1 right-s1"
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

function PromptControls({
  leading,
  chips,
  busy,
  onSubmit,
  submitLabel,
  submitValue,
  submitName,
}: PromptBarProps): ReactElement {
  return (
    <div className="flex min-w-0 items-center gap-s2">
      {leading}
      <div className="flex min-w-0 flex-1 items-center gap-s2">{chips}</div>
      <Button
        tone="primary"
        size="dense"
        busy={busy === true}
        onClick={onSubmit}
        aria-label={submitName}
      >
        {submitLabel}
        {submitValue}
      </Button>
    </div>
  )
}

function PromptBar(props: PromptBarProps): ReactElement {
  const field = useRef<HTMLTextAreaElement>(null)
  useAutoGrow(field)
  const busy = props.busy === true
  const submit = (): void => {
    if (!busy) {
      props.onSubmit()
    }
  }
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (isSubmitKey(event)) {
      event.preventDefault()
      submit()
    }
  }
  return (
    <div
      data-slot="prompt-bar"
      className={cn(
        "flex w-full max-w-prompt-max flex-col gap-s1_5",
        props.className
      )}
    >
      <div
        data-ground="surface"
        className="flex flex-col gap-s2 rounded-vessel bg-surface p-s3"
      >
        <PromptTray {...props} />
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
        <PromptControls {...props} busy={busy} onSubmit={submit} />
      </div>
      {props.price === undefined ? null : (
        <p className="self-end px-s3 text-caption text-ink-muted">
          {props.price}
        </p>
      )}
    </div>
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
    <ul className="flex gap-s2 overflow-x-auto">
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

export type { PromptAttachment, PromptBarProps }
export { PromptBar }
