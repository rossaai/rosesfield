import { TabsList, TabsTrigger, Tabs } from "@rosesfield/ui/components/tabs"
import { useNavigate } from "@tanstack/react-router"
import type { ReactElement } from "react"
import { appName } from "@/catalog/app-facts"
import { findCatalogApp } from "@/catalog/catalog-apps"
import { editToolId, shownTools } from "@/studio/edit/edit-tools"

type ToolRowProps = {
  current: string
  photo: string | null
}

export function ToolRow({ current, photo }: ToolRowProps): ReactElement {
  const navigate = useNavigate()
  const tools = shownTools(findCatalogApp)
  const edit = findCatalogApp(editToolId) ?? findCatalogApp(current)
  return (
    <Tabs
      value={current}
      onValueChange={(next) => {
        if (typeof next !== "string" || next === current) {
          return
        }
        void navigate({
          to: "/apps/$appId",
          params: { appId: next },
          search: photo === null ? {} : { use: photo },
        })
      }}
    >
      <TabsList aria-label={edit === null ? undefined : appName(edit)}>
        {tools.map(({ tool, app }) => (
          <TabsTrigger key={tool.id} value={tool.id}>
            {appName(app)}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
