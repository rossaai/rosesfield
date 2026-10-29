import { isHostedModelId, nameOf } from "@rosesfield/catalog/comfy"
import { Button } from "@rosesfield/ui/components/button"
import { Card } from "@rosesfield/ui/components/card"
import { useQuery } from "@tanstack/react-query"
import type { ReactElement, ReactNode } from "react"
import type { Proposal } from "@/api/conversation-wire"
import { settingsQuery } from "@/api/queries"
import { appName } from "@/catalog/app-facts"
import { findCatalogApp } from "@/catalog/catalog-apps"
import { wordsForError } from "@/copy/error-words"
import { formatNumber, formatWholeCredits } from "@/copy/format"
import { hasCatalogText, t, tCatalog } from "@/copy/t"
import { idsOf } from "@/pieces/run/run-facts"
import {
  type RunFacts,
  RunFactsView,
  runFactsOf,
} from "@/pieces/run/run-inputs"
import { useProposalActs } from "@/screens/agent/conversation-queries"
import { RunCard } from "@/screens/agent/run-card"
import { wordsOfPath } from "@/screens/app/hosted/field-words"
import { priceQuery } from "@/screens/app/hosted/model-catalog-query"

type ProposalCardProps = {
  conversationId: string
  proposal: Proposal
}

const modelInput = "model"

const promptEnding = "prompt"

type ProposalPrice =
  | { kind: "demo"; label: string }
  | { kind: "credits"; amount: string; label: string }

function useProposalPrice(proposal: Proposal): ProposalPrice | null {
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
    enabled:
      !isDemo && proposal.status === "proposed" && proposal.credits === null,
  })
  const found = price.data?.price
  if (isDemo) {
    return { kind: "demo", label: t("run.price.demo") }
  }
  if (proposal.credits !== null) {
    const amount = formatWholeCredits(proposal.credits)
    return {
      kind: "credits",
      amount,
      label: t("run.price.credits", { amount }),
    }
  }
  if (found === undefined || found.source === "unknown") {
    return null
  }
  const amount = formatWholeCredits(found.credits)
  return {
    kind: "credits",
    amount,
    label:
      found.source === "measured"
        ? t("run.price.credits", { amount })
        : t("run.price.estimated", { amount }),
  }
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

export function hostedFactsOf(proposal: Proposal): RunFacts | null {
  const { inputs } = proposal.request
  const model = inputs[modelInput]
  if (typeof model !== "string" || !isHostedModelId(model)) {
    return null
  }
  const facts: RunFacts = {
    prompts: [],
    assetIds: [],
    characterIds: [],
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

function ProposalSettings({
  proposal,
  price,
}: {
  proposal: Proposal
  price: ProposalPrice | null
}): ReactNode {
  const app = findCatalogApp(proposal.appId)
  const facts =
    hostedFactsOf(proposal) ??
    (app === null ? null : runFactsOf(app, { ...proposal.request, seed: null }))
  const shown =
    price?.kind === "credits"
      ? { amount: price.amount, label: price.label }
      : null
  return facts === null ? null : <RunFactsView facts={facts} price={shown} />
}

export function ProposalCard(props: ProposalCardProps): ReactElement {
  const { proposal } = props
  const acts = useProposalActs(props.conversationId, proposal.id)
  const price = useProposalPrice(proposal)
  const app = findCatalogApp(proposal.appId)
  if (proposal.status === "accepted" && proposal.runIds.length > 0) {
    return (
      <div className="flex flex-col gap-s4">
        {proposal.runIds.map((runId) => (
          <RunCard key={runId} runId={runId} />
        ))}
      </div>
    )
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
        {isSkipped || price?.kind === "demo" ? (
          <span className="text-caption text-ink-muted">
            {isSkipped ? t("agent.proposal.skipped") : price?.label}
          </span>
        ) : null}
      </div>
      <ProposalSettings proposal={proposal} price={isSkipped ? null : price} />
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
