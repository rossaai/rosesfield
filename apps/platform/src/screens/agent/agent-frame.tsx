import { IconButton } from "@rosesfield/ui/components/button"
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@rosesfield/ui/components/sheet"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarItem,
  SidebarName,
  SidebarProvider,
  useSidebar,
} from "@rosesfield/ui/components/sidebar"
import { Link } from "@tanstack/react-router"
import { PanelLeftIcon, SquarePenIcon, XIcon } from "lucide-react"
import { type ReactElement, type ReactNode, useState } from "react"
import { t } from "@/copy/t"
import {
  ConversationRows,
  useOpenConversationId,
} from "@/screens/agent/conversation-list"

export function AgentSidebar(): ReactElement {
  const { mode, onNavigate, closeLabel } = useSidebar()
  const openId = useOpenConversationId()
  return (
    <Sidebar data-slot="agent-sidebar" aria-label={t("agent.conversations")}>
      <SidebarHeader>
        <SidebarName>{t("agent.conversations")}</SidebarName>
        {mode === "sheet" ? (
          <IconButton
            label={closeLabel}
            tone="quiet"
            className="bg-transparent"
            onClick={onNavigate}
          >
            <XIcon aria-hidden="true" />
          </IconButton>
        ) : null}
      </SidebarHeader>
      <SidebarContent className="gap-s4">
        <SidebarItem
          icon={<SquarePenIcon aria-hidden="true" />}
          label={t("agent.start")}
          active={openId === null}
          render={<Link to="/agent" activeOptions={{ exact: true }} />}
        />
        <ConversationRows />
      </SidebarContent>
    </Sidebar>
  )
}

export function ConversationsDrawer(): ReactElement {
  const [isOpen, setOpen] = useState(false)
  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <IconButton label={t("agent.conversations")} tone="quiet">
            <PanelLeftIcon aria-hidden="true" />
          </IconButton>
        }
      />
      <SheetContent side="left" aria-label={t("agent.conversations")}>
        <SheetTitle className="sr-only">{t("agent.conversations")}</SheetTitle>
        <SidebarProvider
          mode="sheet"
          width="full"
          closeLabel={t("viewer.close")}
          onNavigate={() => setOpen(false)}
        >
          <AgentSidebar />
        </SidebarProvider>
      </SheetContent>
    </Sheet>
  )
}

export function AgentFrame({
  children,
}: {
  children: ReactNode
}): ReactElement {
  return (
    <div data-slot="agent-frame" className="flex h-full min-h-0">
      <div className="hidden min-h-0 @regular:flex">
        <AgentSidebar />
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
    </div>
  )
}
