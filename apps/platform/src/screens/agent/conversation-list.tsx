import { Button } from "@rosesfield/ui/components/button"
import { interaction } from "@rosesfield/ui/components/interaction"
import { useSidebar } from "@rosesfield/ui/components/sidebar"
import { Skeleton } from "@rosesfield/ui/components/skeleton"
import { cn } from "@rosesfield/ui/lib/cn"
import { motion } from "@rosesfield/ui/motion"
import { useQuery } from "@tanstack/react-query"
import { Link, useRouterState } from "@tanstack/react-router"
import { type ReactElement, type ReactNode, useState } from "react"
import type { Conversation } from "@/api/conversation-wire"
import { t } from "@/copy/t"
import { isModelMissing } from "@/screens/agent/agent-model"
import {
  type ConversationDialog,
  ConversationDialogs,
  ConversationMenu,
} from "@/screens/agent/conversation-menu"
import {
  conversationsQuery,
  newestFirst,
} from "@/screens/agent/conversation-queries"

const agentPath = /^\/agent\/([^/]+)/

export function useOpenConversationId(): string | null {
  return useRouterState({
    select: (state) => agentPath.exec(state.location.pathname)?.[1] ?? null,
  })
}

function RowSkeletons({ count }: { count: number }): ReactElement {
  return (
    <ul data-slot="conversation-skeletons" className="flex flex-col gap-s1">
      {Array.from({ length: count }, (_, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: a skeleton's place is its identity
        <li key={index} className="flex h-button items-center px-s3">
          <Skeleton className="h-[var(--text-body--line-height)] w-3/4 rounded-full" />
        </li>
      ))}
    </ul>
  )
}

type Opened = { conversation: Conversation; dialog: ConversationDialog }

function ConversationRow({
  conversation,
  isOpen,
  onDialog,
}: {
  conversation: Conversation
  isOpen: boolean
  onDialog: (dialog: ConversationDialog) => void
}): ReactElement {
  const { mode, onNavigate } = useSidebar()
  return (
    <li className="group/reveal relative">
      <Link
        to="/agent/$conversationId"
        params={{ conversationId: conversation.id }}
        aria-current={isOpen ? "page" : undefined}
        onClick={onNavigate}
        className={cn(
          "flex h-button w-full min-w-0 items-center rounded-item pr-[calc(var(--spacing-icon-small)+var(--spacing-s2))] pl-s3 text-body text-ink select-none hover:bg-(--tint) aria-[current=page]:bg-(--tint) aria-[current=page]:font-medium",
          motion.tint,
          interaction.ring
        )}
      >
        <span className="min-w-0 truncate">
          {conversation.title ?? t("agent.untitled")}
        </span>
      </Link>
      <div
        className={cn(
          "absolute inset-y-0 right-s1 flex items-center",
          mode === "sheet" || isOpen
            ? ""
            : cn(interaction.reveal, interaction.revealPointer)
        )}
      >
        <ConversationMenu place="row" onDialogChange={onDialog} />
      </div>
    </li>
  )
}

export function ConversationRows(): ReactNode {
  const list = useQuery(conversationsQuery)
  const openId = useOpenConversationId()
  const [opened, setOpened] = useState<Opened | null>(null)
  if (list.isPending) {
    return <RowSkeletons count={4} />
  }
  if (list.isError) {
    return isModelMissing(list.error) ? null : (
      <div className="flex flex-col items-start gap-s2 px-s3 py-s2">
        <p className="text-body text-ink-muted">{t("agent.list.failed")}</p>
        <Button size="small" onClick={() => void list.refetch()}>
          {t("state.tryAgain")}
        </Button>
      </div>
    )
  }
  return (
    <>
      <ul data-slot="conversation-rows" className="flex flex-col gap-s1">
        {newestFirst(list.data).map((conversation) => (
          <ConversationRow
            key={conversation.id}
            conversation={conversation}
            isOpen={conversation.id === openId}
            onDialog={(dialog) =>
              setOpened(dialog === null ? null : { conversation, dialog })
            }
          />
        ))}
      </ul>
      {opened === null ? null : (
        <ConversationDialogs
          conversation={opened.conversation}
          dialog={opened.dialog}
          onDialogChange={(dialog) =>
            setOpened(dialog === null ? null : { ...opened, dialog })
          }
        />
      )}
    </>
  )
}
