import { Button } from "@rosesfield/ui/components/button"
import { ShellLayout } from "@rosesfield/ui/components/shell-layout"
import {
  SidebarProvider,
  type SidebarWidth,
} from "@rosesfield/ui/components/sidebar"
import { StateView } from "@rosesfield/ui/components/state-view"
import { type ReactElement, useState } from "react"
import { t } from "@/gallery/copy.en"
import { NavSidebar } from "@/gallery/entries/nav-sidebar"
import type { GalleryEntry } from "@/gallery/gallery-entry"

function SidebarDemo({ start }: { start: SidebarWidth }): ReactElement {
  const [width, setWidth] = useState<SidebarWidth>(start)
  return (
    <div className="h-[calc(12*var(--spacing-s12))] w-fit overflow-hidden rounded-card">
      <SidebarProvider width={width} mode="column" onWidthChange={setWidth}>
        <NavSidebar />
      </SidebarProvider>
    </div>
  )
}

function ShellDemo({ width }: { width: string }): ReactElement {
  return (
    <div
      className="h-[calc(12*var(--spacing-s12))] max-w-full overflow-hidden rounded-card"
      style={{ width }}
    >
      <ShellLayout
        sidebar={<NavSidebar />}
        title={t("sample.nav.home")}
        menuLabel={t("sample.menuOpen")}
        closeMenuLabel={t("sample.menuClose")}
        storageKey="rosesfield.gallery.sidebar"
      >
        <StateView
          kind="empty"
          title={t("sample.home.title")}
          body={t("sample.empty.body")}
          actions={<Button tone="primary">{t("sample.openApps")}</Button>}
        />
      </ShellLayout>
    </div>
  )
}

const stateView: GalleryEntry = {
  id: "state-view",
  title: "entry.stateView",
  states: [
    {
      id: "full-empty",
      label: "state.fullEmpty",
      render: () => (
        <StateView
          kind="empty"
          mark={<span className="text-title">{t("sample.name")}</span>}
          title={t("sample.empty.title")}
          body={t("sample.empty.body")}
          actions={<Button tone="primary">{t("sample.openApps")}</Button>}
        />
      ),
    },
    {
      id: "full-failed",
      label: "state.fullFailed",
      render: () => (
        <StateView
          kind="failed"
          mark={<span className="text-title">{t("sample.name")}</span>}
          title={t("sample.failed.title")}
          body={t("sample.failed.body")}
          actions={<Button tone="primary">{t("sample.tryAgain")}</Button>}
        />
      ),
    },
    {
      id: "compact-empty",
      label: "state.compactEmpty",
      render: () => (
        <StateView
          kind="empty"
          density="compact"
          title={t("sample.empty.title")}
          body={t("sample.empty.body")}
        />
      ),
    },
    {
      id: "compact-failed",
      label: "state.compactFailed",
      render: () => (
        <StateView
          kind="failed"
          density="compact"
          title={t("sample.libraryFailed")}
          actions={<Button>{t("sample.tryAgain")}</Button>}
        />
      ),
    },
  ],
}

const sidebar: GalleryEntry = {
  id: "sidebar",
  title: "entry.sidebar",
  states: [
    {
      id: "expanded",
      label: "state.expanded",
      render: () => <SidebarDemo start="full" />,
    },
    {
      id: "rail",
      label: "state.rail",
      render: () => <SidebarDemo start="rail" />,
    },
  ],
}

const shellLayout: GalleryEntry = {
  id: "shell-layout",
  title: "entry.shellLayout",
  states: [
    {
      id: "wide",
      label: "state.wide",
      width: "full",
      render: () => (
        <ShellDemo width="calc(var(--container-regular) + var(--spacing-s12))" />
      ),
    },
    {
      id: "phone",
      label: "state.phone",
      width: "full",
      render: () => <ShellDemo width="calc(var(--container-regular) / 2)" />,
    },
  ],
}

export const shellEntries: GalleryEntry[] = [stateView, sidebar, shellLayout]
