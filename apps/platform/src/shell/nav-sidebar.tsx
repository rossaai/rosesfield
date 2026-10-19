import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarItem,
  SidebarName,
  SidebarToggle,
} from "@rosesfield/ui/components/sidebar"
import { useQuery } from "@tanstack/react-query"
import { Link, useMatchRoute, useNavigate } from "@tanstack/react-router"
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
import type { ReactElement } from "react"
import { settingsQuery } from "@/api/queries"
import { t, tCount } from "@/copy/t"
import type { CopyKey } from "@/copy.en"
import { useWorkingRuns } from "@/shell/use-working-runs"

type NavRow = {
  to:
    | "/"
    | "/apps"
    | "/library"
    | "/characters"
    | "/history"
    | "/agent"
    | "/connect"
  label: CopyKey
  icon: ReactElement
}

const rows: readonly NavRow[] = [
  { to: "/", label: "shell.nav.home", icon: <HouseIcon aria-hidden="true" /> },
  {
    to: "/apps",
    label: "shell.nav.apps",
    icon: <LayoutGridIcon aria-hidden="true" />,
  },
  {
    to: "/library",
    label: "shell.nav.library",
    icon: <ImagesIcon aria-hidden="true" />,
  },
  {
    to: "/characters",
    label: "shell.nav.characters",
    icon: <UsersIcon aria-hidden="true" />,
  },
  {
    to: "/history",
    label: "shell.nav.history",
    icon: <HistoryIcon aria-hidden="true" />,
  },
  {
    to: "/agent",
    label: "shell.nav.agent",
    icon: <BotIcon aria-hidden="true" />,
  },
  {
    to: "/connect",
    label: "shell.nav.connect",
    icon: <PlugIcon aria-hidden="true" />,
  },
]

function NavRows(): ReactElement {
  const matchRoute = useMatchRoute()
  const working = useWorkingRuns().length
  return (
    <SidebarContent>
      {rows.map((row) => (
        <SidebarItem
          key={row.to}
          icon={row.icon}
          label={t(row.label)}
          active={matchRoute({ to: row.to, fuzzy: row.to !== "/" }) !== false}
          render={<Link to={row.to} />}
          {...(row.to === "/history" && working > 0
            ? { caption: tCount("shell.history.working", working) }
            : {})}
        />
      ))}
    </SidebarContent>
  )
}

function NavFooter(): ReactElement {
  const matchRoute = useMatchRoute()
  const navigate = useNavigate()
  const settings = useQuery(settingsQuery)
  const isDemo = settings.data?.engine.origin === "demo"
  const tooltip =
    settings.data?.mode === "public"
      ? t("shell.demoEngine.tooltipPublic")
      : t("shell.demoEngine.tooltip")
  return (
    <SidebarFooter>
      {isDemo ? (
        <SidebarItem
          icon={<FlaskConicalIcon aria-hidden="true" />}
          label={t("shell.demoEngine.row")}
          title={tooltip}
          className="text-cem-text"
          onClick={() => void navigate({ to: "/settings" })}
        />
      ) : null}
      <SidebarItem
        icon={<SettingsIcon aria-hidden="true" />}
        label={t("shell.nav.settings")}
        active={matchRoute({ to: "/settings" }) !== false}
        render={<Link to="/settings" />}
      />
    </SidebarFooter>
  )
}

export function NavSidebar(): ReactElement {
  return (
    <Sidebar aria-label={t("shell.name")}>
      <SidebarHeader>
        <SidebarName>{t("shell.name")}</SidebarName>
        <SidebarToggle
          collapseLabel={t("shell.sidebar.collapse")}
          expandLabel={t("shell.sidebar.expand")}
        />
      </SidebarHeader>
      <NavRows />
      <NavFooter />
    </Sidebar>
  )
}
