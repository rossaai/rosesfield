import type { Run } from "@rosesfield/contract"
import { Button, IconButton } from "@rosesfield/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@rosesfield/ui/components/dropdown-menu"
import { Skeleton } from "@rosesfield/ui/components/skeleton"
import { useQuery } from "@tanstack/react-query"
import { Link, useParams } from "@tanstack/react-router"
import { EllipsisIcon } from "lucide-react"
import type { ReactElement, ReactNode } from "react"
import { GatewayRefusedError } from "@/api/gateway-refused.error"
import { isWorking, runQuery } from "@/api/queries"
import { runWorkflow } from "@/catalog/app-workflows"
import { findCatalogApp } from "@/catalog/catalog-apps"
import { formatDate, formatDateTime, formatDuration } from "@/copy/format"
import { t } from "@/copy/t"
import { useDevice } from "@/device/device-context"
import { ContentEndMark, Dock, useContentEnd } from "@/pieces/dock"
import { useOpenInComfy } from "@/pieces/run/open-in-comfy"
import { useCancelRun } from "@/pieces/run/run-actions"
import {
  runAppName,
  runModel,
  runPrice,
  runSeconds,
} from "@/pieces/run/run-facts"
import { RunInputs } from "@/pieces/run/run-inputs"
import { RunOutputs } from "@/pieces/run/run-outputs"
import { ScreenState } from "@/pieces/screen-state"
import { ScreenHeader } from "@/shell/screen-header"

function UseInputs({ run }: { run: Run }): ReactElement {
  return (
    <Button
      tone="primary"
      render={
        <Link
          to="/apps/$appId"
          params={{ appId: run.appId }}
          search={{ from: run.id }}
        />
      }
      nativeButton={false}
    >
      {t("run.useInputs")}
    </Button>
  )
}

function MoreMenu({ run }: { run: Run }): ReactElement {
  const device = useDevice()
  const cancel = useCancelRun()
  const openInComfy = useOpenInComfy(run)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <IconButton label={t("history.run.more")} tone="quiet">
            <EllipsisIcon aria-hidden="true" />
          </IconButton>
        }
      />
      <DropdownMenuContent align="end">
        {openInComfy === null ? null : (
          <DropdownMenuItem onClick={openInComfy}>
            {t("run.openInComfy")}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => void device.copyText(run.id)}>
          {t("history.run.copyId")}
        </DropdownMenuItem>
        {isWorking(run) ? (
          <DropdownMenuItem onClick={() => cancel.mutate(run.id)}>
            {t("state.stop")}
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function Row({
  label,
  children,
}: {
  label: string
  children: ReactNode
}): ReactElement {
  return (
    <div className="flex flex-col gap-s1">
      <dt className="text-label text-ink-muted">{label}</dt>
      <dd className="break-all text-body">{children}</dd>
    </div>
  )
}

function recordRows(run: Run): Array<[string, string]> {
  const model =
    run.origin === "demo"
      ? t("history.run.model.demo")
      : runModel(run, findCatalogApp(run.appId))
  const seconds = runSeconds(run)
  const rows: Array<[string, string | null]> = [
    [t("viewer.label.model"), model],
    [t("viewer.label.seed"), run.seed === null ? null : String(run.seed)],
    [
      t("history.run.engine"),
      run.origin === "demo" ? t("run.demoCaption") : run.engine.adapter,
    ],
    [t("history.run.workflowName"), runWorkflow(run)?.id ?? null],
    [t("history.run.workflow"), run.engine.workflowHash],
    [t("history.run.started"), formatDateTime(run.createdAt)],
    [
      t("history.run.ended"),
      run.finishedAt === null ? null : formatDateTime(run.finishedAt),
    ],
    [t("history.run.taken"), seconds === null ? null : formatDuration(seconds)],
    [t("viewer.label.price"), runPrice(run)],
  ]
  return rows.flatMap(([label, value]) =>
    value === null ? [] : [[label, value]]
  )
}

function RunRecord({ run }: { run: Run }): ReactElement {
  return (
    <dl className="grid gap-s3 @regular:grid-cols-2">
      {recordRows(run).map(([label, value]) => (
        <Row key={label} label={label}>
          {value}
        </Row>
      ))}
    </dl>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: ReactNode
}): ReactElement {
  return (
    <section className="flex flex-col gap-s3">
      <h2 className="text-body font-medium">{title}</h2>
      {children}
    </section>
  )
}

function RunDetail({ run }: { run: Run }): ReactElement {
  const end = useContentEnd()
  return (
    <div className="flex min-h-full flex-col">
      <ScreenHeader
        title={runAppName(run)}
        line={formatDate(run.createdAt)}
        actions={
          <>
            <UseInputs run={run} />
            <MoreMenu run={run} />
          </>
        }
        phoneAction={<MoreMenu run={run} />}
      />
      <div className="flex flex-1 flex-col gap-s8 px-s5 pb-s12 @regular:px-s4">
        <Section title={t("history.run.outputs")}>
          <RunOutputs run={run} />
        </Section>
        <Section title={t("history.run.inputs")}>
          <RunInputs app={findCatalogApp(run.appId)} run={run} />
        </Section>
        <Section title={t("history.run.record")}>
          <RunRecord run={run} />
        </Section>
      </div>
      <ContentEndMark end={end} />
      <Dock
        isRaised={end.isContentBelow}
        className="sticky bottom-0 px-s5 py-s3 @regular:hidden"
      >
        <UseInputs run={run} />
      </Dock>
    </div>
  )
}

function RunMissing({
  isMissing,
  retry,
}: {
  isMissing: boolean
  retry: () => void
}): ReactElement {
  return (
    <>
      <ScreenHeader title={t("history.title")} />
      <ScreenState
        kind={isMissing ? "empty" : "failed"}
        title={
          isMissing ? t("history.run.missing.title") : t("history.failed.title")
        }
        actions={
          isMissing ? (
            <Button
              tone="primary"
              render={<Link to="/history" />}
              nativeButton={false}
            >
              {t("history.run.missing.action")}
            </Button>
          ) : (
            <Button onClick={retry}>{t("state.tryAgain")}</Button>
          )
        }
      />
    </>
  )
}

export function RunScreen(): ReactElement {
  const { runId } = useParams({ from: "/_shell/history/$runId" })
  const run = useQuery(runQuery(runId))
  if (run.data !== undefined) {
    return <RunDetail run={run.data.run} />
  }
  if (run.isError) {
    const isMissing =
      run.error instanceof GatewayRefusedError &&
      run.error.status >= 400 &&
      run.error.status < 500
    return <RunMissing isMissing={isMissing} retry={() => void run.refetch()} />
  }
  return (
    <>
      <ScreenHeader title={<Skeleton className="h-s5 w-tile" />} />
      <div className="flex flex-col gap-s4 px-s5 @regular:px-s4">
        <Skeleton className="aspect-video w-1/2" />
        <Skeleton className="h-s12 w-full" />
        <Skeleton className="h-s12 w-full" />
      </div>
    </>
  )
}
