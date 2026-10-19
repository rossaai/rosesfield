import { Button } from "@rosesfield/ui/components/button"
import { Card } from "@rosesfield/ui/components/card"
import {
  SegmentedControl,
  type SegmentedItem,
} from "@rosesfield/ui/components/segmented-control"
import { Skeleton } from "@rosesfield/ui/components/skeleton"
import { StateView } from "@rosesfield/ui/components/state-view"
import { useQuery } from "@tanstack/react-query"
import { useNavigate, useSearch } from "@tanstack/react-router"
import type { ReactElement, ReactNode } from "react"
import { settingsQuery } from "@/api/queries"
import { t } from "@/copy/t"
import { CodeBlock } from "@/pieces/copy-button"
import {
  apiAddress,
  type ConnectClient,
  mcpAddress,
} from "@/screens/connect/connect-code"
import { ConnectRows } from "@/screens/connect/connect-rows"
import { ConnectSteps } from "@/screens/connect/connect-steps"
import { ScreenHeader } from "@/shell/screen-header"

const clientItems: SegmentedItem<ConnectClient>[] = [
  { value: "claude", label: t("connect.tab.claude") },
  { value: "chatgpt", label: t("connect.tab.chatgpt") },
  { value: "other", label: t("connect.tab.other") },
  { value: "api", label: t("connect.tab.api") },
]

const hostingLink = "https://github.com/rossaai/rosesfield#readme"

function ReachCard(): ReactElement {
  const client = t("connect.tab.chatgpt")
  return (
    <Card className="bg-cem-tint">
      <h2 className="text-body font-medium text-cem-text">
        {t("connect.local.title", { client })}
      </h2>
      <p className="text-body">{t("connect.local.body", { client })}</p>
      <a
        href={hostingLink}
        className="text-body text-hor-text underline"
        target="_blank"
        rel="noreferrer"
      >
        {t("connect.local.action")}
      </a>
    </Card>
  )
}

function Address({ client }: { client: ConnectClient }): ReactNode {
  const settings = useQuery(settingsQuery)
  const origin = window.location.origin
  if (settings.isPending) {
    return <Skeleton className="h-field w-full" />
  }
  if (settings.isError) {
    return (
      <StateView
        kind="failed"
        density="compact"
        title={t("connect.failed.title")}
        actions={
          <Button onClick={() => void settings.refetch()}>
            {t("state.tryAgain")}
          </Button>
        }
      />
    )
  }
  return (
    <>
      <section className="flex flex-col gap-s2">
        <h2 className="text-label text-ink-muted">
          {t("connect.address.label")}
        </h2>
        <CodeBlock
          code={client === "api" ? apiAddress(origin) : mcpAddress(origin)}
        />
        {settings.data.mode === "public" ? (
          <p className="text-label text-ink-muted">{t("connect.key.note")}</p>
        ) : null}
        {settings.data.lock === "token" ? (
          <p className="text-label text-ink-muted">{t("connect.token.note")}</p>
        ) : null}
      </section>
      {client === "chatgpt" && settings.data.lock === "local" ? (
        <ReachCard />
      ) : null}
    </>
  )
}

export function ConnectScreen(): ReactElement {
  const search = useSearch({ from: "/_shell/connect" })
  const navigate = useNavigate({ from: "/connect" })
  const client: ConnectClient = search.client ?? "claude"
  return (
    <>
      <ScreenHeader title={t("connect.title")} />
      <div className="flex flex-col gap-s8 px-s5 pb-s12 @regular:px-s4">
        <SegmentedControl
          items={clientItems}
          value={client}
          onValueChange={(next) =>
            void navigate({ search: { client: next }, replace: true })
          }
          label={t("connect.client.label")}
          className="max-w-prompt-max"
        />
        <div className="flex w-full max-w-prompt-max flex-col gap-s8">
          <Address client={client} />
          <ConnectSteps client={client} />
          <ConnectRows client={client} />
        </div>
      </div>
    </>
  )
}
