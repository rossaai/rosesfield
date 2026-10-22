import { isHostedModelId, nameOf } from "@rosesfield/catalog/comfy"
import { Badge } from "@rosesfield/ui/components/badge"
import { Button } from "@rosesfield/ui/components/button"
import { Card } from "@rosesfield/ui/components/card"
import { useQuery } from "@tanstack/react-query"
import type { ReactElement } from "react"
import type { Proposal } from "@/api/conversation-wire"
import { settingsQuery } from "@/api/queries"
import { appName } from "@/catalog/app-facts"
import { findCatalogApp } from "@/catalog/catalog-apps"
import { wordsForError } from "@/copy/error-words"
import { formatAmount, formatNumber } from "@/copy/format"
import { hasCatalogText, t, tCatalog } from "@/copy/t"
import { AssetTile } from "@/pieces/asset-tile"
import { idsOf } from "@/pieces/run/run-facts"
import { RunInputs } from "@/pieces/run/run-inputs"
import { useProposalActs } from "@/screens/agent/conversation-queries"
import { RunCard } from "@/screens/agent/run-card"
import { wordsOfPath } from "@/screens/app/hosted/field-words"
import { priceQuery } from "@/screens/app/hosted/model-catalog-query"

type ProposalCardProps = {
  conversationId: string
  proposal: Proposal
}

type ProposalFact = { key: string; text: string }

export type ProposalFacts = {
  prompts: ProposalFact[]
  assetIds: string[]
  badges: ProposalFact[]
}

const modelInput = "model"

const promptEnding = "prompt"

function useProposalPrice(proposal: Proposal): string | null {
  const settings = useQuery(settingsQuery)
  const isDemo = settings.data?.engine.origin === "demo"
  const { request } = proposal
  const price = useQuery({
    ...priceQuery(
      proposal.appId,
      {
        inputs: request.inputs,
        count: request.count,
        aspectRatio: request.aspectRatio,
      },
      settings.data?.engine.key ?? "unknown"
    ),
    enabled: !isDemo && proposal.status === "proposed",
  })
  const found = price.data?.price
  if (isDemo) {
    return t("run.price.demo")
  }
  if (found === undefined || found.source === "unknown") {
    return null
  }
  const amount = formatAmount(found.credits)
  return found.source === "measured"
    ? t("run.price.credits", { amount })
    : t("run.price.estimated", { amount })
}

function settingLabel(name: string): string {
  const key = `model.field.${name}`
  return hasCatalogText(key)
    ? tCatalog(key)
    : t("model.field.other", { name: wordsOfPath(name) })
}

function badgeOf(name: string, value: unknown): string {
  if (typeof value === "number") {
    return t("run.field", {
      caption: settingLabel(name),
      value: formatNumber(value),
    })
  }
  return String(value)
}

export function hostedFactsOf(proposal: Proposal): ProposalFacts | null {
  const { inputs } = proposal.request
  const model = inputs[modelInput]
  if (typeof model !== "string" || !isHostedModelId(model)) {
    return null
  }
  const facts: ProposalFacts = {
    prompts: [],
    assetIds: [],
    badges: [{ key: modelInput, text: nameOf(model) }],
  }
  for (const [name, value] of Object.entries(inputs)) {
    if (name === modelInput || value === null || value === undefined) {
      continue
    }
    if (Array.isArray(value)) {
      facts.assetIds.push(...idsOf(value))
    } else if (name.endsWith(promptEnding) && typeof value === "string") {
      facts.prompts.push({ key: name, text: value.trim() })
    } else {
      facts.badges.push({ key: name, text: badgeOf(name, value) })
    }
  }
  return facts
}

function ProposalFactsView({ facts }: { facts: ProposalFacts }): ReactElement {
  return (
    <div className="flex flex-col gap-s3">
      {facts.prompts.map((prompt) => (
        <p key={prompt.key} className="whitespace-pre-wrap text-body">
          {prompt.text}
        </p>
      ))}
      {facts.assetIds.length === 0 ? null : (
        <span className="flex flex-wrap gap-s2">
          {facts.assetIds.map((assetId) => (
            <span key={assetId} className="size-thumb">
              <AssetTile assetId={assetId} shape="square" />
            </span>
          ))}
        </span>
      )}
      <span data-slot="proposal-badges" className="flex flex-wrap gap-s1">
        {facts.badges.map((badge) => (
          <Badge key={badge.key} className="ms-0">
            {badge.text}
          </Badge>
        ))}
      </span>
    </div>
  )
}

function ProposalSettings({ proposal }: { proposal: Proposal }): ReactElement {
  const facts = hostedFactsOf(proposal)
  if (facts === null) {
    const app = findCatalogApp(proposal.appId)
    return <RunInputs app={app} run={{ ...proposal.request, seed: null }} />
  }
  return <ProposalFactsView facts={facts} />
}

export function ProposalCard(props: ProposalCardProps): ReactElement {
  const { proposal } = props
  const acts = useProposalActs(props.conversationId, proposal.id)
  const price = useProposalPrice(proposal)
  const app = findCatalogApp(proposal.appId)
  if (proposal.status === "accepted" && proposal.runId !== null) {
    return <RunCard runId={proposal.runId} />
  }
  const failure = acts.generate.error ?? acts.skip.error
  const isSkipped = proposal.status === "skipped"
  const isOpen = proposal.status === "proposed"
  return (
    <Card className="gap-s4">
      <div className="flex items-baseline justify-between gap-s2">
        <h3 className="text-body font-medium">
          {app === null ? proposal.appId : appName(app)}
        </h3>
        {isSkipped || price !== null ? (
          <span className="text-caption text-ink-muted">
            {isSkipped ? t("agent.proposal.skipped") : price}
          </span>
        ) : null}
      </div>
      <ProposalSettings proposal={proposal} />
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
