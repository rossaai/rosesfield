import { Button } from "@rosesfield/ui/components/button"
import { Card, CardTitle } from "@rosesfield/ui/components/card"
import { useQuery } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import type { ReactElement } from "react"
import type { GatewaySettings } from "@/api/gateway-settings"
import { forgetOwnerToken, readOwnerToken } from "@/api/owner-token"
import { settingsQuery } from "@/api/queries"
import { t } from "@/copy/t"
import { RetentionLine } from "@/screens/settings/key-dialog"
import { ServerPart } from "@/screens/settings/server-part"
import { VisitorKeyField } from "@/screens/settings/visitor-key-field"

function agentStatus(settings: GatewaySettings): string {
  if (settings.agent !== "set") {
    return settings.mode === "public"
      ? t("settings.agent.status.needsKey")
      : t("settings.agent.status.missing")
  }
  return settings.agentModel === null
    ? t("settings.agent.status.set")
    : t("settings.agent.status.model", { model: settings.agentModel })
}

function AgentParts({ settings }: { settings: GatewaySettings }): ReactElement {
  const isPublic = settings.mode === "public"
  return (
    <>
      <p className="text-body">{agentStatus(settings)}</p>
      {isPublic ? (
        <>
          <p className="text-body text-ink-muted">
            {t("settings.visitor.agentNote")}
          </p>
          <VisitorKeyField kind="agent" />
        </>
      ) : null}
      {!isPublic && settings.agent !== "set" ? (
        <p className="text-body text-ink-muted">{t("settings.agent.howTo")}</p>
      ) : null}
    </>
  )
}

export function AgentCard(): ReactElement {
  return (
    <Card>
      <CardTitle>{t("settings.agent.title")}</CardTitle>
      <ServerPart>
        {(settings) => <AgentParts settings={settings} />}
      </ServerPart>
    </Card>
  )
}

function OwnerLock({ settings }: { settings: GatewaySettings }): ReactElement {
  const navigate = useNavigate()
  const lock = async (): Promise<void> => {
    await forgetOwnerToken()
    await navigate({ to: "/unlock", search: { next: "/settings" } })
  }
  return (
    <>
      <p className="text-body">
        {settings.lock === "local"
          ? t("settings.lock.local")
          : t("settings.lock.on")}
      </p>
      {readOwnerToken() === null ? null : (
        <Button className="self-start" onClick={() => void lock()}>
          {t("settings.lock.action")}
        </Button>
      )}
    </>
  )
}

function PublicDemo(): ReactElement {
  return (
    <>
      <p className="text-body">{t("settings.public.body")}</p>
      <p className="text-body text-ink-muted">{t("settings.public.session")}</p>
      <RetentionLine />
    </>
  )
}

export function LockCard(): ReactElement {
  const isPublic = useQuery(settingsQuery).data?.mode === "public"
  return (
    <Card>
      <CardTitle>
        {isPublic ? t("settings.public.title") : t("settings.lock.title")}
      </CardTitle>
      <ServerPart>
        {(settings) =>
          settings.mode === "public" ? (
            <PublicDemo />
          ) : (
            <OwnerLock settings={settings} />
          )
        }
      </ServerPart>
    </Card>
  )
}
