import type { KeyCheck } from "@rosesfield/contract"
import { Button } from "@rosesfield/ui/components/button"
import { cn } from "@rosesfield/ui/lib/cn"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  CoinsIcon,
  FlaskConicalIcon,
  GaugeIcon,
  KeyRoundIcon,
  LinkIcon,
  ServerIcon,
  TerminalIcon,
  TimerIcon,
  TrashIcon,
} from "lucide-react"
import { type ReactElement, type ReactNode, useState } from "react"
import { checkEngineKey, liveCheckOf } from "@/api/engine-checks"
import type { EngineTarget, GatewaySettings } from "@/api/gateway-settings"
import { forgetVisitorKey, useHasVisitorKey } from "@/api/visitor-keys"
import { formatNumber } from "@/copy/format"
import { t, tCount } from "@/copy/t"
import { noteAgentModel } from "@/screens/agent/agent-model"
import { accountQuery, forgetAccount } from "@/screens/settings/account-query"
import { isRefusal, KeyDialog, KeyRefusal } from "@/screens/settings/key-dialog"
import { ServerPart } from "@/screens/settings/server-part"
import {
  SettingsButtonRow,
  SettingsGroup,
  SettingsLinkRow,
  SettingsRow,
} from "@/screens/settings/settings-row"

export const targetsLink =
  "https://github.com/rossaai/rosesfield/blob/main/docs/stack.md#the-one-engine"

export function targetName(target: EngineTarget): string {
  return t(`settings.target.${target}`)
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

export function AccountRows(): ReactNode {
  const account = useQuery(accountQuery).data
  const credits = account?.credits ?? null
  const cap = account?.cap ?? null
  return (
    <>
      {credits === null ? null : (
        <SettingsRow
          icon={<CoinsIcon />}
          label={t("key.balance", { amount: formatNumber(credits) })}
        />
      )}
      {cap === null ? null : (
        <SettingsRow
          icon={<GaugeIcon />}
          label={
            cap.left > 0
              ? t("key.cap.left", {
                  left: formatNumber(cap.left),
                  cap: formatNumber(cap.credits),
                })
              : t("key.cap.spent", { cap: formatNumber(cap.credits) })
          }
        />
      )}
    </>
  )
}

export function RetentionRow(): ReactNode {
  const days = useQuery(accountQuery).data?.retentionDays ?? null
  return days === null ? null : (
    <SettingsRow icon={<TimerIcon />} label={tCount("key.retention", days)} />
  )
}

function KeyRow({ settings }: { settings: GatewaySettings }): ReactElement {
  const check = useMutation({ mutationFn: checkEngineKey })
  const result = check.data === undefined ? null : liveCheckOf(check.data)
  const isBad =
    check.isError || result === "invalid" || result === "unreachable"
  return (
    <SettingsRow
      icon={<KeyRoundIcon />}
      label={t("settings.engine.key")}
      value={
        <span
          role={isBad ? "alert" : undefined}
          className={cn(isBad ? "text-bug-text" : "")}
        >
          {check.isError
            ? t("settings.engine.checkFailed")
            : statusText(settings.engine, result)}
        </span>
      }
      {...(settings.engine.origin === "live"
        ? {
            control: (
              <Button
                size="small"
                busy={check.isPending}
                onClick={() => check.mutate()}
              >
                {t("settings.engine.check")}
              </Button>
            ),
          }
        : {})}
    />
  )
}

function ServerEngine({
  settings,
}: {
  settings: GatewaySettings
}): ReactElement {
  const { engine } = settings
  const needsKey = engine.origin === "demo" || engine.key === "missing"
  return (
    <>
      {engine.origin === "demo" ? (
        <SettingsGroup>
          <SettingsRow
            icon={<FlaskConicalIcon className="text-cem-text" />}
            label={t("settings.demo.title")}
          />
        </SettingsGroup>
      ) : null}
      <SettingsGroup>
        <SettingsRow
          icon={<ServerIcon />}
          label={t("settings.engine.target")}
          value={targetName(engine.target)}
        />
        {engine.address === null ? null : (
          <SettingsRow
            icon={<LinkIcon />}
            label={t("settings.engine.address")}
            value={
              <code className="font-mono text-code">{engine.address}</code>
            }
          />
        )}
        <KeyRow settings={settings} />
        <AccountRows />
      </SettingsGroup>
      {needsKey ? (
        <SettingsGroup>
          <SettingsLinkRow
            icon={<TerminalIcon />}
            label={t("settings.engine.howTo")}
            href={targetsLink}
          />
        </SettingsGroup>
      ) : null}
    </>
  )
}

function VisitorKey(): ReactElement {
  const client = useQueryClient()
  const hasKey = useHasVisitorKey("engine")
  const status = useQuery(accountQuery).data?.key ?? null
  const [isAdding, setAdding] = useState(false)
  const forget = (): void => {
    void forgetVisitorKey("engine")
      .then(() => noteAgentModel("unknown"))
      .then(() => forgetAccount().catch(() => undefined))
      .then(() => client.invalidateQueries())
  }
  return (
    <>
      <SettingsGroup>
        {hasKey ? (
          <>
            <SettingsRow icon={<KeyRoundIcon />} label={t("key.kept")} />
            <AccountRows />
          </>
        ) : (
          <SettingsButtonRow
            icon={<KeyRoundIcon />}
            label={t("key.add")}
            onPress={() => setAdding(true)}
          />
        )}
        <RetentionRow />
      </SettingsGroup>
      {hasKey && status !== null && isRefusal(status) ? (
        <KeyRefusal status={status} />
      ) : null}
      {hasKey ? (
        <SettingsGroup>
          <SettingsButtonRow
            icon={<TrashIcon />}
            label={t("key.forget")}
            tone="danger"
            onPress={forget}
          />
        </SettingsGroup>
      ) : null}
      <KeyDialog open={isAdding} onOpenChange={setAdding} />
    </>
  )
}

export function EnginePane(): ReactElement {
  return (
    <ServerPart>
      {(settings) =>
        settings.keyFrom === "settings" ? (
          <VisitorKey />
        ) : (
          <ServerEngine settings={settings} />
        )
      }
    </ServerPart>
  )
}
