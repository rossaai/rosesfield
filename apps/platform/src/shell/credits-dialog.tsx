import { Button } from "@rosesfield/ui/components/button"
import { DialogFooter } from "@rosesfield/ui/components/dialog"
import { useQuery } from "@tanstack/react-query"
import { CreditCardIcon, FlaskConicalIcon, KeyRoundIcon } from "lucide-react"
import type { ReactElement } from "react"
import type { GatewaySettings } from "@/api/gateway-settings"
import { settingsQuery } from "@/api/queries"
import { useHasVisitorKey } from "@/api/visitor-keys"
import { t } from "@/copy/t"
import { DialogOrSheet } from "@/pieces/responsive-layer"
import { comfyBillingPage } from "@/screens/app/hosted/model-notice"
import { AccountRows, statusText } from "@/screens/settings/engine-pane"
import {
  SettingsGroup,
  SettingsLinkRow,
  SettingsRow,
} from "@/screens/settings/settings-row"

function keyState(settings: GatewaySettings, hasKey: boolean): string {
  if (settings.keyFrom === "settings") {
    return hasKey ? t("key.kept") : t("settings.engine.status.missing")
  }
  return statusText(settings.engine, null)
}

function CreditRows({ settings }: { settings: GatewaySettings }): ReactElement {
  const hasKey = useHasVisitorKey("engine")
  const isDemo =
    settings.engine.origin === "demo" &&
    !(settings.keyFrom === "settings" && hasKey)
  return (
    <SettingsGroup>
      {isDemo ? (
        <SettingsRow
          icon={<FlaskConicalIcon className="text-cem-text" />}
          label={t("settings.demo.title")}
        />
      ) : null}
      <AccountRows />
      <SettingsRow
        icon={<KeyRoundIcon />}
        label={t("settings.engine.key")}
        value={keyState(settings, hasKey)}
      />
      <SettingsLinkRow
        icon={<CreditCardIcon />}
        label={t("key.no-plan.action")}
        href={comfyBillingPage}
      />
    </SettingsGroup>
  )
}

export function CreditsDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}): ReactElement {
  const settings = useQuery(settingsQuery).data
  return (
    <DialogOrSheet
      open={open}
      onOpenChange={onOpenChange}
      title={t("key.account.title")}
    >
      <div data-slot="credits-dialog" className="flex flex-col gap-s4">
        {settings === undefined ? null : <CreditRows settings={settings} />}
        <DialogFooter>
          <Button tone="primary" onClick={() => onOpenChange(false)}>
            {t("key.done")}
          </Button>
        </DialogFooter>
      </div>
    </DialogOrSheet>
  )
}
