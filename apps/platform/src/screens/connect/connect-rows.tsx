import type { AppListing } from "@rosesfield/contract"
import { useQuery } from "@tanstack/react-query"
import { type MouseEvent, type ReactElement, useState } from "react"
import { callPath } from "@/api/call-path"
import { readOwnerToken } from "@/api/owner-token"
import { settingsQuery } from "@/api/queries"
import { appName, takesText } from "@/catalog/app-facts"
import { catalogApps } from "@/catalog/catalog-apps"
import { t } from "@/copy/t"
import { useDevice } from "@/device/device-context"
import { CopyButton } from "@/pieces/copy-button"
import {
  type ConnectClient,
  credentialOf,
  curlExample,
  runPath,
  schemaPathOf,
} from "@/screens/connect/connect-code"

function SchemaLink({ app }: { app: AppListing }): ReactElement {
  const device = useDevice()
  const [isFailed, setFailed] = useState(false)
  const path = schemaPathOf(app)
  const save = async (event: MouseEvent<HTMLAnchorElement>): Promise<void> => {
    if (readOwnerToken() === null) {
      return
    }
    event.preventDefault()
    setFailed(false)
    try {
      const response = await callPath({
        method: "GET",
        path,
        accept: "application/schema+json, application/json",
      })
      await device.save({
        name: `${app.id}.schema.json`,
        blob: await response.blob(),
      })
    } catch {
      setFailed(true)
    }
  }
  return (
    <span className="flex shrink-0 flex-col items-end gap-s1">
      <a
        href={path}
        target="_blank"
        rel="noreferrer"
        onClick={(event) => void save(event)}
        className="text-body text-hor-text underline"
      >
        {t("connect.api.schema")}
      </a>
      {isFailed ? (
        <span role="alert" className="text-caption text-bug-text">
          {t("connect.api.schemaFailed")}
        </span>
      ) : null}
    </span>
  )
}

function ToolRows(): ReactElement {
  return (
    <ul>
      {catalogApps.map((app) => (
        <li
          key={app.id}
          className="flex flex-col gap-s1 border-b border-(--line) py-s3"
        >
          <span className="flex flex-wrap items-baseline gap-s2">
            <span className="text-body font-medium">{appName(app)}</span>
            <code className="font-mono text-code text-ink-muted">{app.id}</code>
          </span>
          <span className="text-caption text-ink-muted">{takesText(app)}</span>
        </li>
      ))}
    </ul>
  )
}

function RouteRows(): ReactElement {
  const settings = useQuery(settingsQuery)
  const credential = credentialOf(settings.data)
  return (
    <ul>
      {catalogApps.map((app) => (
        <li
          key={app.id}
          className="flex items-center gap-s2 border-b border-(--line) py-s3"
        >
          <span className="flex min-w-0 flex-1 flex-col gap-s1">
            <span className="text-body font-medium">{appName(app)}</span>
            <code className="font-mono text-code break-all text-ink-muted">
              POST {runPath(app)}
            </code>
          </span>
          <SchemaLink app={app} />
          <CopyButton
            text={curlExample(window.location.origin, app, credential)}
            label={t("connect.api.copyExample")}
          />
        </li>
      ))}
    </ul>
  )
}

export function ConnectRows({
  client,
}: {
  client: ConnectClient
}): ReactElement | null {
  if (catalogApps.length === 0) {
    return null
  }
  return (
    <section className="flex flex-col gap-s3">
      <h2 className="text-title">
        {client === "api"
          ? t("connect.routes.title")
          : t("connect.tools.title")}
      </h2>
      {client === "api" ? <RouteRows /> : <ToolRows />}
    </section>
  )
}
