import { Button } from "@rosesfield/ui/components/button"
import { CreditPrice } from "@rosesfield/ui/components/credit-price"
import { Skeleton } from "@rosesfield/ui/components/skeleton"
import { StateView } from "@rosesfield/ui/components/state-view"
import { cn } from "@rosesfield/ui/lib/cn"
import { motion } from "@rosesfield/ui/motion"
import type { ReactElement, ReactNode } from "react"
import type { TranscriptItem } from "@/api/conversation-wire"
import { wordsForCode } from "@/copy/error-words"
import { formatAmount } from "@/copy/format"
import { t } from "@/copy/t"
import { useAssetThumbs } from "@/pieces/attachment-thumbs"
import type { AnswerPart, Turn } from "@/screens/agent/conversation-store"
import { splitMessage } from "@/screens/agent/message-text"
import { ProposalCard } from "@/screens/agent/proposal-card"
import { RunCard } from "@/screens/agent/run-card"

type PersonMessage = { prompt: string; assetIds: string[] }

function YourMessage({ message }: { message: PersonMessage }): ReactElement {
  const thumbs = useAssetThumbs(message.assetIds)
  return (
    <div
      data-slot="your-message"
      className="flex w-full flex-col items-end gap-s2"
    >
      {thumbs.length === 0 ? null : (
        <div className="flex max-w-[85%] flex-wrap justify-end gap-s2">
          {thumbs.map((thumb) => (
            <img
              key={thumb.id}
              src={thumb.src}
              alt={thumb.alt}
              className="size-thumb rounded-cell bg-(--well) object-cover"
            />
          ))}
        </div>
      )}
      {message.prompt === "" ? null : (
        <p
          data-ground="surface"
          data-slot="your-message-text"
          className="max-w-[85%] rounded-card bg-surface px-s5 py-s3 text-body whitespace-pre-wrap wrap-break-word"
        >
          {message.prompt}
        </p>
      )}
    </div>
  )
}

function AgentText({
  text,
  isGrowing = false,
}: {
  text: string
  isGrowing?: boolean
}): ReactElement {
  return (
    <p
      className={cn(
        "max-w-prose-max text-body whitespace-pre-wrap",
        isGrowing ? motion.pulse : ""
      )}
    >
      {text}
    </p>
  )
}

function TurnCredits({ credits }: { credits: number }): ReactElement {
  const amount = formatAmount(credits)
  return (
    <p
      data-slot="turn-credits"
      title={t("run.price.credits", { amount })}
      className="text-caption text-ink-muted"
    >
      <CreditPrice amount={amount} />
    </p>
  )
}

function itemNode(conversationId: string, item: TranscriptItem): ReactNode {
  switch (item.type) {
    case "person":
      return <YourMessage message={splitMessage(item.text)} />
    case "agent":
      return <AgentText text={item.text} />
    case "run":
      return <RunCard runId={item.runId} />
    case "proposal":
      return (
        <ProposalCard
          conversationId={conversationId}
          proposal={item.proposal}
        />
      )
    case "credits":
      return <TurnCredits credits={item.credits} />
  }
}

function groupsOf(items: readonly TranscriptItem[]): TranscriptItem[][] {
  const groups: TranscriptItem[][] = []
  for (const item of items) {
    const last = groups.at(-1)
    if (item.type === "person" || last === undefined) {
      groups.push([item])
    } else {
      last.push(item)
    }
  }
  return groups
}

export function TranscriptItems({
  conversationId,
  items,
}: {
  conversationId: string
  items: readonly TranscriptItem[]
}): ReactElement {
  return (
    <>
      {groupsOf(items).map((group, groupIndex) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: the transcript only grows, so a turn's place is its identity
        <div key={groupIndex} className="flex flex-col gap-s4">
          {group.map((item, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: an item's place in its turn is its identity
            <div key={index} className="flex flex-col">
              {itemNode(conversationId, item)}
            </div>
          ))}
        </div>
      ))}
    </>
  )
}

function partNode(
  conversationId: string,
  part: AnswerPart,
  isGrowing: boolean
): ReactNode {
  switch (part.kind) {
    case "text":
      return <AgentText text={part.text} isGrowing={isGrowing} />
    case "run":
      return <RunCard runId={part.runId} />
    case "proposal":
      return (
        <ProposalCard
          conversationId={conversationId}
          proposal={part.proposal}
        />
      )
  }
}

function partKey(part: AnswerPart): string {
  switch (part.kind) {
    case "text":
      return `text-${part.index}`
    case "run":
      return `run-${part.runId}`
    case "proposal":
      return `proposal-${part.proposal.id}`
  }
}

export function LiveTurn({
  conversationId,
  turn,
  onRetry,
}: {
  conversationId: string
  turn: Turn
  onRetry: (turn: Turn) => void
}): ReactElement {
  const isAnswering = turn.status === "answering"
  return (
    <div className="flex flex-col gap-s4">
      <YourMessage message={turn} />
      {turn.parts.map((part, index) => (
        <div key={partKey(part)} className="flex flex-col">
          {partNode(
            conversationId,
            part,
            isAnswering && index === turn.parts.length - 1
          )}
        </div>
      ))}
      {isAnswering && turn.parts.length === 0 ? (
        <span
          role="status"
          aria-label={t("state.working")}
          className={cn(
            "block h-s5 w-tile rounded-full bg-(--well)",
            motion.pulse
          )}
        />
      ) : null}
      {turn.status === "failed" ? (
        <StateView
          kind="failed"
          density="compact"
          title={t("agent.failed.title")}
          body={
            wordsForCode(turn.failureCode ?? "unknown", {
              thing: "conversation",
            }).body
          }
          actions={
            <Button onClick={() => onRetry(turn)}>{t("state.tryAgain")}</Button>
          }
        />
      ) : null}
      {turn.credits === null ? null : <TurnCredits credits={turn.credits} />}
      {turn.status === "stopped" ? (
        <p className="text-caption text-ink-muted">{t("state.stopped")}</p>
      ) : null}
    </div>
  )
}

export function MessageSkeletons(): ReactElement {
  return (
    <div className="flex flex-col gap-s6" aria-hidden="true">
      <Skeleton className="h-s12 w-[calc(3*var(--spacing-tile))] self-end rounded-card" />
      <Skeleton className="h-[calc(2*var(--spacing-s12))] w-full max-w-prose-max rounded-card" />
      <Skeleton className="h-s12 w-[calc(2*var(--spacing-tile))] self-end rounded-card" />
      <Skeleton className="h-[calc(3*var(--spacing-s12))] w-full rounded-card" />
    </div>
  )
}
