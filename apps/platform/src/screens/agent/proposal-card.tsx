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
import { formatAmount, formatNumber } from "@/copy/format"
import { hasCatalogText, t, tCatalog } from "@/copy/t"
import { AssetTile } from "@/pieces/asset-tile"
import { RunInputs } from "@/pieces/run/run-inputs"
import { useProposalActs } from "@/screens/agent/conversation-queries"
import { RunCard } from "@/screens/agent/run-card"
import { wordsOfPath } from "@/screens/app/hosted/field-words"
import { priceQuery } from "@/screens/app/hosted/model-catalog-query"

type ProposalCardProps = {
  conversationId: string
  proposal: Proposal
}

type SettingRow = { key: string; label: string; value: ReactNode }

const modelInput = "model"

function useProposalPrice(proposal: Proposal): string {
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
    return t("run.price.unknown")
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

function settingValue(value: unknown): ReactNode {
  if (Array.isArray(value)) {
    return (
      <span className="flex flex-wrap gap-s2">
        {value.map((assetId: unknown) => (
          <span key={String(assetId)} className="size-thumb">
            <AssetTile assetId={String(assetId)} shape="square" />
          </span>
        ))}
      </span>
    )
  }
  return (
    <span className="whitespace-pre-wrap">
      {typeof value === "number" ? formatNumber(value) : String(value)}
    </span>
  )
}

export function hostedRowsOf(proposal: Proposal): SettingRow[] | null {
  const { inputs } = proposal.request
  const model = inputs[modelInput]
  if (typeof model !== "string" || !isHostedModelId(model)) {
    return null
  }
  const settings = Object.entries(inputs)
    .filter(([name]) => name !== modelInput)
    .map(([name, value]) => ({
      key: name,
      label: settingLabel(name),
      value: settingValue(value),
    }))
  return [
    { key: modelInput, label: t("model.picker.title"), value: nameOf(model) },
    ...settings,
  ]
}

function ProposalSettings({ proposal }: { proposal: Proposal }): ReactElement {
  const rows = hostedRowsOf(proposal)
  if (rows === null) {
    const app = findCatalogApp(proposal.appId)
    return <RunInputs app={app} run={{ ...proposal.request, seed: null }} />
  }
  return (
    <dl className="flex flex-col gap-s3">
      {rows.map((row) => (
        <div key={row.key} className="flex flex-col gap-s1">
          <dt className="text-label text-ink-muted">{row.label}</dt>
          <dd className="text-body">{row.value}</dd>
        </div>
      ))}
    </dl>
  )
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
        <span className="text-caption text-ink-muted">
          {isSkipped ? t("agent.proposal.skipped") : price}
        </span>
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
