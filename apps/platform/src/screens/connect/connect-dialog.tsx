import { Button } from "@rosesfield/ui/components/button"
import { DialogFooter } from "@rosesfield/ui/components/dialog"
import {
  SegmentedControl,
  type SegmentedItem,
} from "@rosesfield/ui/components/segmented-control"
import { useToast } from "@rosesfield/ui/components/toast"
import { useQuery } from "@tanstack/react-query"
import { CopyIcon } from "lucide-react"
import type { ReactElement, ReactNode } from "react"
import type { GatewaySettings } from "@/api/gateway-settings"
import { useKeyReach } from "@/api/key-reach"
import { settingsQuery } from "@/api/queries"
import { catalogApps } from "@/catalog/catalog-apps"
import { t } from "@/copy/t"
import type { CopyKey } from "@/copy.en"
import { useDevice } from "@/device/device-context"
import { DialogOrSheet } from "@/pieces/responsive-layer"
import { comfyKeyPage } from "@/screens/app/hosted/model-notice"
import {
  type ConnectClient,
  claudeCommand,
  clientConfig,
  credentialOf,
  curlExample,
  mcpAddress,
} from "@/screens/connect/connect-code"
import {
  ExternalLink,
  KeyField,
  KeyRefusal,
  useKeyEntry,
} from "@/screens/settings/key-dialog"

const clientItems: SegmentedItem<ConnectClient>[] = [
  { value: "claude", label: t("connect.tab.claude") },
  { value: "chatgpt", label: t("connect.tab.chatgpt") },
  { value: "other", label: t("connect.tab.other") },
  { value: "api", label: t("connect.tab.api") },
]

const hostingLink = "https://github.com/rossaai/rosesfield#readme"

const keyFormId = "connect-key"

export type Instruction = { steps: readonly CopyKey[]; code: string }

export function instructionOf(
  client: ConnectClient,
  origin: string,
  settings: GatewaySettings | undefined
): Instruction {
  const credential = credentialOf(settings)
  const firstApp = catalogApps[0]
  switch (client) {
    case "claude":
      return {
        steps: ["connect.claude.step.1"],
        code: claudeCommand(origin, credential),
      }
    case "chatgpt":
      return {
        steps: ["connect.chatgpt.step.1", "connect.chatgpt.step.2"],
        code: mcpAddress(origin),
      }
    case "other":
      return {
        steps: ["connect.other.step.1"],
        code: clientConfig(origin, credential),
      }
    case "api":
      return {
        steps: ["connect.api.step.1"],
        code:
          firstApp === undefined
            ? `${origin}/api`
            : curlExample(origin, firstApp, credential),
      }
  }
}

function CredentialNote({
  settings,
}: {
  settings: GatewaySettings | undefined
}): ReactNode {
  if (settings?.mode === "public") {
    return <p className="text-label text-ink-muted">{t("connect.key.note")}</p>
  }
  return settings?.lock === "token" ? (
    <p className="text-label text-ink-muted">{t("connect.token.note")}</p>
  ) : null
}

function ReachNote(): ReactElement {
  const client = t("connect.tab.chatgpt")
  return (
    <div className="flex flex-col gap-s1 rounded-cell bg-cem-tint p-s3">
      <p className="text-body font-medium text-cem-text">
        {t("connect.local.title", { client })}
      </p>
      <ExternalLink href={hostingLink}>
        {t("connect.local.action")}
      </ExternalLink>
    </div>
  )
}

function InstructionBody({
  client,
  instruction,
  settings,
}: {
  client: ConnectClient
  instruction: Instruction
  settings: GatewaySettings | undefined
}): ReactElement {
  return (
    <div data-slot="connect-instruction" className="flex flex-col gap-s3">
      {instruction.steps.map((step) => (
        <p key={step} className="text-body">
          {t(step)}
        </p>
      ))}
      <div
        data-slot="connect-command"
        className="overflow-x-auto rounded-cell bg-(--well) p-s3 [scrollbar-width:thin]"
      >
        <pre className="w-max font-mono text-code whitespace-pre">
          {instruction.code}
        </pre>
      </div>
      <CredentialNote settings={settings} />
      {client === "chatgpt" && settings?.lock === "local" ? (
        <ReachNote />
      ) : null}
    </div>
  )
}

type ConnectDialogProps = {
  open: boolean
  client: ConnectClient
  onClient: (client: ConnectClient) => void
  onOpenChange: (open: boolean) => void
}

function ClientChoice(props: ConnectDialogProps): ReactElement {
  return (
    <SegmentedControl
      items={clientItems}
      value={props.client}
      onValueChange={props.onClient}
      label={t("connect.client.label")}
      className="max-w-none"
    />
  )
}

function KeyStep(props: ConnectDialogProps): ReactElement {
  const entry = useKeyEntry()
  return (
    <>
      <form
        id={keyFormId}
        data-slot="connect-key"
        onSubmit={(event) => {
          event.preventDefault()
          entry.onSubmit()
        }}
        className="flex flex-col gap-s3"
      >
        <p className="text-body">{t("key.sentence")}</p>
        <ExternalLink href={comfyKeyPage}>{t("key.page")}</ExternalLink>
        <KeyField
          value={entry.value}
          onChange={entry.onChange}
          problem={entry.problem}
        />
        {entry.refusal === null ? null : <KeyRefusal status={entry.refusal} />}
      </form>
      <DialogFooter>
        <Button tone="quiet" onClick={() => props.onOpenChange(false)}>
          {t("connect.cancel")}
        </Button>
        <Button type="submit" form={keyFormId} tone="primary" busy={entry.busy}>
          {t("key.save")}
        </Button>
      </DialogFooter>
    </>
  )
}

function CopyStep(
  props: ConnectDialogProps & { settings: GatewaySettings | undefined }
): ReactElement {
  const device = useDevice()
  const toast = useToast()
  const instruction = instructionOf(
    props.client,
    window.location.origin,
    props.settings
  )
  const copy = async (): Promise<void> => {
    await device.copyText(instruction.code)
    toast.add({ title: t("output.copied") })
    props.onOpenChange(false)
  }
  return (
    <>
      <ClientChoice {...props} />
      <InstructionBody
        client={props.client}
        instruction={instruction}
        settings={props.settings}
      />
      <DialogFooter>
        <Button tone="quiet" onClick={() => props.onOpenChange(false)}>
          {t("connect.cancel")}
        </Button>
        <Button tone="primary" onClick={() => void copy()}>
          <CopyIcon aria-hidden="true" />
          {t("connect.copy")}
        </Button>
      </DialogFooter>
    </>
  )
}

export function ConnectDialog(props: ConnectDialogProps): ReactElement {
  const settings = useQuery(settingsQuery).data
  const needsKey = useKeyReach() === "add"
  return (
    <DialogOrSheet
      open={props.open}
      onOpenChange={props.onOpenChange}
      title={needsKey ? t("key.title") : t("connect.title")}
    >
      {needsKey ? (
        <KeyStep {...props} />
      ) : (
        <CopyStep {...props} settings={settings} />
      )}
    </DialogOrSheet>
  )
}
