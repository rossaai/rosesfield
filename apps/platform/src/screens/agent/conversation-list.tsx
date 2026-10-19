import { Button, IconButton } from "@rosesfield/ui/components/button"
import { Skeleton } from "@rosesfield/ui/components/skeleton"
import { useQuery } from "@tanstack/react-query"
import { Link, useNavigate } from "@tanstack/react-router"
import { MessagesSquareIcon } from "lucide-react"
import { type ReactElement, type ReactNode, useState } from "react"
import { formatDate } from "@/copy/format"
import { t } from "@/copy/t"
import { PopoverOrSheet } from "@/pieces/responsive-layer"
import { isModelMissing } from "@/screens/agent/agent-model"
import {
  conversationsQuery,
  newestFirst,
} from "@/screens/agent/conversation-queries"

type RowsProps = {
  limit: number
  onOpen?: () => void
}

function RowSkeletons({ count }: { count: number }): ReactElement {
  return (
    <ul className="flex flex-col">
      {Array.from({ length: count }, (_, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: a skeleton's place is its identity
        <li key={index} className="flex justify-between gap-s3 px-s2 py-s2">
          <Skeleton className="h-s5 w-[calc(3*var(--spacing-tile))]" />
          <Skeleton className="h-s5 w-tile" />
        </li>
      ))}
    </ul>
  )
}

export function ConversationRows({ limit, onOpen }: RowsProps): ReactNode {
  const list = useQuery(conversationsQuery)
  if (list.isPending) {
    return <RowSkeletons count={3} />
  }
  if (list.isError) {
    return isModelMissing(list.error) ? null : (
      <div className="flex flex-col items-start gap-s2 px-s2">
        <p className="text-body text-ink-muted">{t("agent.list.failed")}</p>
        <Button onClick={() => void list.refetch()}>
          {t("state.tryAgain")}
        </Button>
      </div>
    )
  }
  const rows = newestFirst(list.data).slice(0, limit)
  return (
    <ul className="flex flex-col">
      {rows.map((item) => (
        <li key={item.id}>
          <Link
            to="/agent/$conversationId"
            params={{ conversationId: item.id }}
            {...(onOpen === undefined ? {} : { onClick: onOpen })}
            className="flex items-baseline justify-between gap-s3 rounded-item px-s2 py-s2 hover:bg-(--tint)"
          >
            <span className="min-w-0 truncate text-body">
              {item.title ?? t("agent.untitled")}
            </span>
            <span className="shrink-0 text-caption text-ink-muted">
              {formatDate(item.createdAt)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

export function useHasConversations(): boolean {
  const list = useQuery(conversationsQuery)
  return (list.data?.length ?? 0) > 0
}

type ConversationsButtonProps = {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  foot?: ReactNode
}

export function ConversationsButton(
  props: ConversationsButtonProps
): ReactElement {
  const [ownOpen, setOwnOpen] = useState(false)
  const isOpen = props.open ?? ownOpen
  const setOpen = props.onOpenChange ?? setOwnOpen
  const navigate = useNavigate()
  return (
    <PopoverOrSheet
      open={isOpen}
      onOpenChange={setOpen}
      title={t("agent.conversations")}
      trigger={
        <IconButton label={t("agent.conversations")} tone="quiet">
          <MessagesSquareIcon aria-hidden="true" />
        </IconButton>
      }
    >
      <div className="flex max-h-[calc(8*var(--spacing-button))] flex-col gap-s2 overflow-y-auto">
        <Button
          tone="quiet"
          className="max-w-none shrink-0 justify-start"
          onClick={() => {
            setOpen(false)
            void navigate({ to: "/agent" })
          }}
        >
          {t("agent.start")}
        </Button>
        <ConversationRows limit={50} onOpen={() => setOpen(false)} />
        {props.foot}
      </div>
    </PopoverOrSheet>
  )
}
