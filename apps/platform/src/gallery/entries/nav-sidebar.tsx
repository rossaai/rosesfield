import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarItem,
  SidebarName,
  SidebarToggle,
} from "@rosesfield/ui/components/sidebar"
import {
  BotIcon,
  FlaskConicalIcon,
  HistoryIcon,
  HouseIcon,
  ImagesIcon,
  LayoutGridIcon,
  PlugIcon,
  SettingsIcon,
  UsersIcon,
} from "lucide-react"
import { type ReactElement, useState } from "react"
import { type GalleryKey, t, tCount } from "@/gallery/copy.en"

const rows: Array<{ key: GalleryKey; icon: ReactElement }> = [
  { key: "sample.nav.home", icon: <HouseIcon aria-hidden="true" /> },
  { key: "sample.nav.apps", icon: <LayoutGridIcon aria-hidden="true" /> },
  { key: "sample.nav.library", icon: <ImagesIcon aria-hidden="true" /> },
  { key: "sample.nav.characters", icon: <UsersIcon aria-hidden="true" /> },
  { key: "sample.nav.history", icon: <HistoryIcon aria-hidden="true" /> },
  { key: "sample.nav.agent", icon: <BotIcon aria-hidden="true" /> },
  { key: "sample.nav.mcp", icon: <PlugIcon aria-hidden="true" /> },
]

export function NavSidebar(): ReactElement {
  const [current, setCurrent] = useState<GalleryKey>("sample.nav.home")
  const working = tCount(
    { one: "sample.runsWorking.one", other: "sample.runsWorking.other" },
    2
  )
  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarName>{t("sample.name")}</SidebarName>
        <SidebarToggle
          collapseLabel={t("sample.collapse")}
          expandLabel={t("sample.expand")}
        />
      </SidebarHeader>
      <SidebarContent>
        {rows.map((row) => (
          <SidebarItem
            key={row.key}
            icon={row.icon}
            label={t(row.key)}
            active={row.key === current}
            onClick={() => setCurrent(row.key)}
            {...(row.key === "sample.nav.history" ? { caption: working } : {})}
          />
        ))}
      </SidebarContent>
      <SidebarFooter>
        <SidebarItem
          icon={<FlaskConicalIcon aria-hidden="true" />}
          label={t("sample.demoEngine")}
          className="text-cem-text"
        />
        <SidebarItem
          icon={<SettingsIcon aria-hidden="true" />}
          label={t("sample.nav.settings")}
        />
      </SidebarFooter>
    </Sidebar>
  )
}
