import { useQuery } from "@tanstack/react-query"
import type { ReactElement } from "react"
import { settingsQuery } from "@/api/queries"
import { catalogApps } from "@/catalog/catalog-apps"
import { t } from "@/copy/t"
import type { CopyKey } from "@/copy.en"
import { CodeBlock } from "@/pieces/copy-button"
import {
  type ConnectClient,
  type Credential,
  claudeCommand,
  clientConfig,
  credentialOf,
  curlExample,
} from "@/screens/connect/connect-code"

type Step = { key: CopyKey; code: string | null }

function stepsOf(
  client: ConnectClient,
  origin: string,
  credential: Credential
): Step[] {
  const firstApp = catalogApps[0]
  switch (client) {
    case "claude":
      return [
        {
          key: "connect.claude.step.1",
          code: claudeCommand(origin, credential),
        },
        { key: "connect.claude.step.2", code: null },
        { key: "connect.claude.step.3", code: null },
      ]
    case "chatgpt":
      return [
        { key: "connect.chatgpt.step.1", code: null },
        { key: "connect.chatgpt.step.2", code: null },
        { key: "connect.chatgpt.step.3", code: null },
      ]
    case "other":
      return [
        { key: "connect.other.step.1", code: clientConfig(origin, credential) },
        { key: "connect.other.step.2", code: null },
        { key: "connect.other.step.3", code: null },
      ]
    case "api":
      return [
        {
          key: "connect.api.step.1",
          code:
            firstApp === undefined
              ? null
              : curlExample(origin, firstApp, credential),
        },
        { key: "connect.api.step.2", code: null },
        { key: "connect.api.step.3", code: null },
      ]
  }
}

export function ConnectSteps({
  client,
}: {
  client: ConnectClient
}): ReactElement {
  const settings = useQuery(settingsQuery)
  const steps = stepsOf(
    client,
    window.location.origin,
    credentialOf(settings.data)
  )
  return (
    <section className="flex flex-col gap-s3">
      <h2 className="text-title">{t("connect.steps.title")}</h2>
      <ol className="flex flex-col gap-s4">
        {steps.map((step, index) => (
          <li key={step.key} className="flex gap-s3 text-body">
            <span aria-hidden="true" className="w-s5 shrink-0 text-ink-muted">
              {index + 1}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-s2">
              <p className="max-w-prose-max">{t(step.key)}</p>
              {step.code === null ? null : <CodeBlock code={step.code} />}
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
