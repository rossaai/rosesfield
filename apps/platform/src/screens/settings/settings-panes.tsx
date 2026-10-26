import { Switch } from "@rosesfield/ui/components/switch"
import { useNavigate } from "@tanstack/react-router"
import {
  BotIcon,
  CloudIcon,
  CodeIcon,
  GlobeIcon,
  HandIcon,
  LockIcon,
  LockOpenIcon,
  LogOutIcon,
  ScaleIcon,
  ServerIcon,
  SunMoonIcon,
  TagIcon,
  TerminalIcon,
} from "lucide-react"
import { type ReactElement, useState } from "react"
import type { GatewaySettings } from "@/api/gateway-settings"
import { type KeyReach, useKeyReach } from "@/api/key-reach"
import { forgetOwnerToken, readOwnerToken } from "@/api/owner-token"
import { t } from "@/copy/t"
import { keepRunApproval, useRunApproval } from "@/screens/agent/run-approval"
import { RetentionRow, targetsLink } from "@/screens/settings/engine-pane"
import { ServerPart } from "@/screens/settings/server-part"
import {
  SettingsButtonRow,
  SettingsGroup,
  SettingsLinkRow,
  SettingsRow,
  SettingsSelectRow,
} from "@/screens/settings/settings-row"
import {
  keepThemeChoice,
  readThemeChoice,
  type ThemeChoice,
} from "@/theme/theme-choice"

const sourceLink = "https://github.com/rossaai/rosesfield"
const licencesLink = `${sourceLink}/blob/main/docs/models.md`
const agentLink = `${sourceLink}/blob/main/docs/stack.md#the-agents-model`

function agentStatus(settings: GatewaySettings, reach: KeyReach): string {
  if (settings.agent !== "set") {
    return reach === "add"
      ? t("settings.agent.status.needsKey")
      : t("settings.agent.status.missing")
  }
  return t("settings.agent.status.set")
}

function AskRow(): ReactElement {
  const approval = useRunApproval()
  return (
    <SettingsGroup label={t("settings.group.general")}>
      <SettingsRow
        icon={<HandIcon />}
        label={t("agent.ask.label")}
        control={
          <Switch
            aria-label={t("agent.ask.label")}
            checked={approval === "ask"}
            onCheckedChange={(checked) =>
              keepRunApproval(checked ? "ask" : "auto")
            }
          />
        }
      />
    </SettingsGroup>
  )
}

function AgentRows({ settings }: { settings: GatewaySettings }): ReactElement {
  const reach = useKeyReach()
  const model = settings.agent === "set" ? settings.agentModel : null
  return (
    <>
      <SettingsGroup label={t("settings.agent.model")}>
        {model === null ? (
          <SettingsRow
            icon={<BotIcon />}
            label={agentStatus(settings, reach)}
          />
        ) : (
          <SettingsRow
            icon={<BotIcon />}
            label={t("settings.agent.model")}
            value={model}
          />
        )}
      </SettingsGroup>
      <AskRow />
      {settings.mode !== "public" && settings.agent !== "set" ? (
        <SettingsGroup label={t("settings.group.help")}>
          <SettingsLinkRow
            icon={<TerminalIcon />}
            label={t("settings.agent.howTo")}
            href={agentLink}
          />
        </SettingsGroup>
      ) : null}
    </>
  )
}

export function AgentPane(): ReactElement {
  return (
    <ServerPart>{(settings) => <AgentRows settings={settings} />}</ServerPart>
  )
}

function OwnerLock({ settings }: { settings: GatewaySettings }): ReactElement {
  const navigate = useNavigate()
  const lock = async (): Promise<void> => {
    await forgetOwnerToken()
    await navigate({ to: "/unlock", search: { next: "/settings" } })
  }
  const isLocal = settings.lock === "local"
  return (
    <SettingsGroup label={t("settings.group.server")}>
      <SettingsRow
        icon={isLocal ? <LockOpenIcon /> : <LockIcon />}
        label={isLocal ? t("settings.lock.local") : t("settings.lock.on")}
      />
      {readOwnerToken() === null ? null : (
        <SettingsButtonRow
          icon={<LogOutIcon />}
          label={t("settings.lock.action")}
          onPress={() => void lock()}
        />
      )}
    </SettingsGroup>
  )
}

function PublicWork(): ReactElement {
  return (
    <SettingsGroup label={t("settings.group.privacy")}>
      <SettingsRow icon={<GlobeIcon />} label={t("settings.public.body")} />
      <SettingsRow icon={<CloudIcon />} label={t("settings.public.session")} />
      <RetentionRow />
    </SettingsGroup>
  )
}

export function LockPane(): ReactElement {
  return (
    <ServerPart>
      {(settings) =>
        settings.mode === "public" ? (
          <PublicWork />
        ) : (
          <OwnerLock settings={settings} />
        )
      }
    </ServerPart>
  )
}

const themes: ReadonlyArray<{ value: ThemeChoice; label: string }> = [
  { value: "system", label: t("settings.theme.system") },
  { value: "light", label: t("settings.theme.light") },
  { value: "dark", label: t("settings.theme.dark") },
]

export function AppearancePane(): ReactElement {
  const [theme, setTheme] = useState(readThemeChoice)
  return (
    <SettingsGroup label={t("settings.group.general")}>
      <SettingsSelectRow
        icon={<SunMoonIcon />}
        label={t("settings.theme.label")}
        value={theme}
        options={themes}
        onValueChange={(next) => {
          setTheme(next)
          keepThemeChoice(next)
        }}
      />
    </SettingsGroup>
  )
}

export function AboutPane(): ReactElement {
  return (
    <SettingsGroup label={t("shell.name")}>
      {__APP_VERSION__ === "" ? null : (
        <SettingsRow
          icon={<TagIcon />}
          label={t("settings.about.version", { version: __APP_VERSION__ })}
        />
      )}
      <SettingsLinkRow
        icon={<CodeIcon />}
        label={t("settings.about.code")}
        href={sourceLink}
      />
      <SettingsLinkRow
        icon={<ServerIcon />}
        label={t("settings.about.targets")}
        href={targetsLink}
      />
      <SettingsLinkRow
        icon={<ScaleIcon />}
        label={t("settings.about.licences")}
        href={licencesLink}
      />
    </SettingsGroup>
  )
}
