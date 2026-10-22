import { IconButton } from "@rosesfield/ui/components/button"
import {
  Composer,
  ComposerChips,
  ComposerToolbar,
} from "@rosesfield/ui/components/composer"
import { GenerateButton } from "@rosesfield/ui/components/generate-button"
import { cn } from "@rosesfield/ui/lib/cn"
import { motion } from "@rosesfield/ui/motion"
import { XIcon } from "lucide-react"
import {
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  type RefObject,
  useLayoutEffect,
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

const fieldClass = cn(
  "mb-s1_5 block max-h-[calc(6*var(--text-body--line-height)+var(--spacing-s1_5))] w-full resize-none overflow-y-auto bg-transparent px-s2 pt-s1_5 text-body text-ink outline-none placeholder:text-ink-muted",
  motion.yield
)

const placements = {
  inline: "max-w-220",
  dock: "fixed inset-x-s5 bottom-s5 z-40 mx-auto max-w-220",
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

function Toolbar({ leading, chips }: PromptBarProps): ReactElement {
  return (
    <ComposerToolbar>
      {leading}
      {chips === undefined ? null : <ComposerChips>{chips}</ComposerChips>}
    </ComposerToolbar>
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
    <div data-slot="composer-prompt" className="flex items-start">
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
  const placement = props.placement ?? "inline"
  const submit = (): void => {
    if (!busy) {
      props.onSubmit()
    }
  }
  return (
    <Composer
      data-bar="prompt"
      data-placement={placement}
      floating={placement === "dock"}
      className={cn(placements[placement], props.className)}
    >
      {props.tray === undefined ? null : (
        <div data-slot="composer-tray">{props.tray}</div>
      )}
      <div className="flex items-end gap-s3">
        <div className="flex min-w-0 flex-1 flex-col gap-s2">
          <PromptTray {...props} />
          <PromptField props={props} onSubmit={submit} />
          {props.notices === undefined ? null : (
            <div data-slot="composer-notices">{props.notices}</div>
          )}
          <Toolbar {...props} />
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
    </Composer>
  )
}

export type { PromptAttachment, PromptBarProps }
export { PromptBar }
