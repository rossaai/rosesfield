import type { KeyCheck } from "@rosesfield/contract"
import { Button } from "@rosesfield/ui/components/button"
import { Card, CardTitle } from "@rosesfield/ui/components/card"
import { cn } from "@rosesfield/ui/lib/cn"
import { useMutation } from "@tanstack/react-query"
import { CheckIcon } from "lucide-react"
import type { ReactElement } from "react"
import { checkEngineKey, liveCheckOf } from "@/api/engine-checks"
import type { EngineTarget, GatewaySettings } from "@/api/gateway-settings"
import { t } from "@/copy/t"
import { OwnerBalance, PublicKey } from "@/screens/settings/public-key"
import { ServerPart } from "@/screens/settings/server-part"

export function targetName(target: EngineTarget): string {
  return t(`settings.target.${target}`)
}

function DemoNotice(): ReactElement {
  return (
    <div className="flex flex-col gap-s1 rounded-cell bg-cem-tint p-s3">
      <p className="text-body font-medium text-cem-text">
        {t("settings.demo.title")}
      </p>
      <p className="text-body">{t("settings.demo.body")}</p>
    </div>
  )
}

function statusText(
  engine: GatewaySettings["engine"],
  check: KeyCheck | null
): string {
  const target = targetName(engine.target)
  if (check !== null) {
    return t(`settings.engine.status.${check}`, { target })
  }
  if (engine.origin === "demo") {
    return t("settings.engine.status.missing")
  }
  return engine.key === "set"
    ? t("settings.engine.status.unchecked")
    : t("settings.engine.status.keyless")
}

function KeyStatus({ settings }: { settings: GatewaySettings }): ReactElement {
  const check = useMutation({ mutationFn: checkEngineKey })
  const result = check.data === undefined ? null : liveCheckOf(check.data)
  const { engine } = settings
  return (
    <div className="flex flex-col gap-s2">
      <div className="flex flex-wrap items-center justify-between gap-s2">
        <p
          className={cn(
            "flex items-center gap-s1_5 text-body",
            result === "invalid" || result === "unreachable"
              ? "text-bug-text"
              : ""
          )}
        >
          {result === "valid" ? (
            <CheckIcon aria-hidden="true" className="glyph text-ink-muted" />
          ) : null}
          {statusText(engine, result)}
        </p>
        {engine.origin === "live" ? (
          <Button busy={check.isPending} onClick={() => check.mutate()}>
            {t("settings.engine.check")}
          </Button>
        ) : null}
      </div>
      {check.isError ? (
        <p role="alert" className="text-label text-bug-text">
          {t("settings.engine.checkFailed")}
        </p>
      ) : null}
    </div>
  )
}

function TargetFacts({
  settings,
}: {
  settings: GatewaySettings
}): ReactElement {
  const { engine } = settings
  return (
    <dl className="flex flex-col gap-s3">
      <div className="flex flex-col gap-s1">
        <dt className="text-label text-ink-muted">
          {t("settings.engine.target")}
        </dt>
        <dd className="text-body">{targetName(engine.target)}</dd>
      </div>
      {engine.address === null ? null : (
        <div className="flex flex-col gap-s1">
          <dt className="text-label text-ink-muted">
            {t("settings.engine.address")}
          </dt>
          <dd className="font-mono text-code break-all">{engine.address}</dd>
        </div>
      )}
    </dl>
  )
}

function EngineParts({
  settings,
}: {
  settings: GatewaySettings
}): ReactElement {
  if (settings.mode === "public") {
    return <PublicKey />
  }
  return (
    <>
      {settings.engine.origin === "demo" ? <DemoNotice /> : null}
      <TargetFacts settings={settings} />
      <KeyStatus settings={settings} />
      <OwnerBalance />
      <p className="text-body text-ink-muted">{t("settings.engine.howTo")}</p>
    </>
  )
}

export function EngineCard(): ReactElement {
  return (
    <Card>
      <CardTitle>{t("settings.engine.title")}</CardTitle>
      <ServerPart>
        {(settings) => <EngineParts settings={settings} />}
      </ServerPart>
    </Card>
  )
}
