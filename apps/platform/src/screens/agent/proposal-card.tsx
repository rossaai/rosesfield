import { Button } from "@rosesfield/ui/components/button"
import { Card } from "@rosesfield/ui/components/card"
import { useQuery } from "@tanstack/react-query"
import type { ReactElement } from "react"
import type { Proposal } from "@/api/conversation-wire"
import { settingsQuery } from "@/api/queries"
import { appName } from "@/catalog/app-facts"
import { findCatalogApp } from "@/catalog/catalog-apps"
import { wordsForError } from "@/copy/error-words"
import { t } from "@/copy/t"
import { RunInputs } from "@/pieces/run/run-inputs"
import { useProposalActs } from "@/screens/agent/conversation-queries"
import { RunCard } from "@/screens/agent/run-card"

type ProposalCardProps = {
  conversationId: string
  proposal: Proposal
}

function usePriceText(): string {
  const settings = useQuery(settingsQuery)
  return settings.data?.engine.origin === "demo"
    ? t("run.price.demo")
    : t("run.price.unknown")
}

export function ProposalCard(props: ProposalCardProps): ReactElement {
  const { proposal } = props
  const acts = useProposalActs(props.conversationId, proposal.id)
  const price = usePriceText()
  const app = findCatalogApp(proposal.appId)
  if (proposal.status === "accepted" && proposal.runId !== null) {
    return <RunCard runId={proposal.runId} />
  }
  const values = { ...proposal.request, seed: null }
  const failure = acts.generate.error ?? acts.skip.error
  const isSkipped = proposal.status === "skipped"
  const isOpen = proposal.status === "proposed"
  return (
    <Card className="gap-s4">
      <div className="flex items-baseline justify-between gap-s2">
        <h3 className="text-body font-medium">
          {app === null ? proposal.appId : appName(app)}
        </h3>
        <span className="text-caption text-ink-muted">
          {isSkipped ? t("agent.proposal.skipped") : price}
        </span>
      </div>
      <RunInputs app={app} run={values} />
      {failure === null ? null : (
        <p role="alert" className="text-label text-bug-text">
          {wordsForError(failure, { thing: "run" }).title}
        </p>
      )}
      {isOpen ? (
        <div className="flex flex-wrap gap-s2">
          <Button
            tone="primary"
            busy={acts.generate.isPending}
            onClick={() => acts.generate.mutate()}
          >
            {t("run.generate")}
          </Button>
          <Button busy={acts.skip.isPending} onClick={() => acts.skip.mutate()}>
            {t("agent.proposal.skip")}
          </Button>
        </div>
      ) : null}
    </Card>
  )
}
