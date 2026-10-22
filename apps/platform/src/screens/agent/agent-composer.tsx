import { IconButton } from "@rosesfield/ui/components/button"
import {
  Composer,
  ComposerToolbar as KernelToolbar,
} from "@rosesfield/ui/components/composer"
import { interaction } from "@rosesfield/ui/components/interaction"
import type { PromptAttachment } from "@rosesfield/ui/components/prompt-bar"
import { cn } from "@rosesfield/ui/lib/cn"
import {
  ArrowUpIcon,
  AtSignIcon,
  HandIcon,
  PlusIcon,
  SquareIcon,
  XIcon,
} from "lucide-react"
import {
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  type RefObject,
  useLayoutEffect,
  useRef,
  useState,
} from "react"
import type { RunApproval } from "@/api/conversation-wire"
import { t } from "@/copy/t"
import { AttachMenu } from "@/pieces/attach-menu"
import { useAssetThumbs, useCharacterThumbs } from "@/pieces/attachment-thumbs"
import { CharacterPicker } from "@/pieces/character-picker"
import { type Mention, useMention } from "@/pieces/draft-bar"
import { LibraryPicker } from "@/pieces/library-picker"
import type { DraftState } from "@/pieces/use-draft"
import {
  useAgentModels,
  useChooseAgentModel,
} from "@/screens/agent/agent-model"
import { AgentModelPicker } from "@/screens/app/hosted/agent-model-picker"

const quietCircle = cn(
  "bg-transparent aria-expanded:bg-(--tint) data-popup-open:bg-(--tint)",
  interaction.fill
)

const fieldClass =
  "mb-s1_5 block max-h-[calc(6*var(--text-body--line-height)+var(--spacing-s1_5))] w-full resize-none overflow-y-auto bg-transparent px-s2 pt-s1_5 text-body text-ink outline-none placeholder:text-ink-muted"

function isSubmitKey(event: KeyboardEvent<HTMLTextAreaElement>): boolean {
  return (
    event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing
  )
}

function useFieldHeight(
  field: RefObject<HTMLTextAreaElement | null>,
  value: string
): void {
  useLayoutEffect(() => {
    const element = field.current
    if (element === null || element.value !== value) {
      return
    }
    element.style.height = "auto"
    element.style.height = `${element.scrollHeight}px`
  }, [field, value])
}

function PromptField({
  value,
  onValueChange,
  onSubmit,
}: {
  value: string
  onValueChange: (value: string) => void
  onSubmit: () => void
}): ReactElement {
  const field = useRef<HTMLTextAreaElement>(null)
  useFieldHeight(field, value)
  return (
    <textarea
      ref={field}
      rows={1}
      data-slot="agent-composer-field"
      aria-label={t("agent.prompt.label")}
      placeholder={t("agent.prompt.placeholder")}
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
      onKeyDown={(event) => {
        if (isSubmitKey(event)) {
          event.preventDefault()
          onSubmit()
        }
      }}
      className={fieldClass}
    />
  )
}

function AttachmentRow({
  attachments,
  onRemove,
}: {
  attachments: readonly PromptAttachment[]
  onRemove: (id: string) => void
}): ReactNode {
  if (attachments.length === 0) {
    return null
  }
  return (
    <ul
      data-slot="agent-composer-attachments"
      className="flex gap-s2 overflow-x-auto"
    >
      {attachments.map((attachment) => (
        <li key={attachment.id} className="relative shrink-0">
          <img
            src={attachment.src}
            alt={attachment.alt}
            className="size-thumb rounded-dense bg-(--tint) object-cover"
          />
          <IconButton
            label={t("bar.attachment.remove")}
            size="badge"
            tone="glass"
            className="absolute top-s1 right-s1"
            onClick={() => onRemove(attachment.id)}
          >
            <XIcon aria-hidden="true" />
          </IconButton>
        </li>
      ))}
    </ul>
  )
}

function ModelPill(): ReactElement | null {
  const models = useAgentModels()
  const choose = useChooseAgentModel()
  const listed = models.data
  if (listed === undefined || listed.model === null) {
    return null
  }
  return (
    <AgentModelPicker
      models={listed.models}
      rates={listed.rates}
      chosen={(choose.isPending ? choose.variables : null) ?? listed.model}
      onChoose={(model) => choose.mutate(model)}
      disabled={choose.isPending}
    />
  )
}

export function AskToggle({
  value,
  onValueChange,
}: {
  value: RunApproval
  onValueChange: (value: RunApproval) => void
}): ReactElement {
  const isAsking = value === "ask"
  return (
    <IconButton
      label={t("agent.ask.label")}
      tone="quiet"
      aria-pressed={isAsking}
      onClick={() => onValueChange(isAsking ? "auto" : "ask")}
    >
      <HandIcon aria-hidden="true" />
    </IconButton>
  )
}

function SendCircle({
  isAnswering,
  isArmed,
  busy,
  onSend,
  onStop,
}: {
  isAnswering: boolean
  isArmed: boolean
  busy: boolean
  onSend: () => void
  onStop: () => void
}): ReactElement {
  if (isAnswering) {
    return (
      <IconButton label={t("agent.stop")} tone="primary" onClick={onStop}>
        <SquareIcon aria-hidden="true" />
      </IconButton>
    )
  }
  return (
    <IconButton
      label={t("agent.send")}
      tone="primary"
      busy={busy}
      disabled={!isArmed}
      onClick={onSend}
    >
      <ArrowUpIcon aria-hidden="true" />
    </IconButton>
  )
}

function MentionCircle({ mention }: { mention: Mention }): ReactElement {
  return (
    <CharacterPicker
      open={mention.isOpen}
      onOpenChange={mention.setOpen}
      onPick={mention.onPick}
      trigger={
        <IconButton label={t("bar.mention")} tone="quiet">
          <AtSignIcon aria-hidden="true" />
        </IconButton>
      }
    />
  )
}

type AgentComposerProps = {
  state: DraftState
  isAnswering: boolean
  isStarting?: boolean
  approval: RunApproval
  onApprovalChange: (approval: RunApproval) => void
  onSend: () => void
  onStop: () => void
  className?: string
}

function ComposerToolbar({
  props,
  mention,
  isArmed,
  busy,
  send,
  openLibrary,
}: {
  props: AgentComposerProps
  mention: Mention
  isArmed: boolean
  busy: boolean
  send: () => void
  openLibrary: () => void
}): ReactElement {
  return (
    <KernelToolbar data-slot="agent-composer-toolbar">
      <AttachMenu
        form="menu"
        label={t("bar.attach")}
        glyph={<PlusIcon aria-hidden="true" />}
        className={quietCircle}
        onUpload={() => void props.state.upload()}
        onFromLibrary={openLibrary}
      />
      <MentionCircle mention={mention} />
      <ModelPill />
      <span className="min-w-0 flex-1" />
      <AskToggle
        value={props.approval}
        onValueChange={props.onApprovalChange}
      />
      <SendCircle
        isAnswering={props.isAnswering}
        isArmed={isArmed}
        busy={busy}
        onSend={send}
        onStop={props.onStop}
      />
    </KernelToolbar>
  )
}

export function AgentComposer(props: AgentComposerProps): ReactElement {
  const { state } = props
  const [isLibraryOpen, setLibraryOpen] = useState(false)
  const mention = useMention(state)
  const attachments = [
    ...useAssetThumbs(state.draft.assetIds),
    ...useCharacterThumbs(state.draft.characterIds),
  ]
  const busy = props.isStarting === true || state.isUploading
  const isArmed = state.draft.prompt.trim() !== "" && !busy
  const send = (): void => {
    if (!props.isAnswering && isArmed) {
      props.onSend()
    }
  }
  return (
    <>
      <Composer
        data-bar="agent"
        floating
        className={cn("max-w-prompt-max", props.className)}
      >
        <AttachmentRow
          attachments={attachments}
          onRemove={state.removeAttachment}
        />
        <PromptField
          value={state.draft.prompt}
          onValueChange={mention.onValueChange}
          onSubmit={send}
        />
        <ComposerToolbar
          props={props}
          mention={mention}
          isArmed={isArmed}
          busy={busy}
          send={send}
          openLibrary={() => setLibraryOpen(true)}
        />
      </Composer>
      <LibraryPicker
        open={isLibraryOpen}
        onOpenChange={setLibraryOpen}
        kind={null}
        max={16}
        title={t("bar.addMenu.fromLibrary")}
        onDone={state.addAssets}
      />
    </>
  )
}
