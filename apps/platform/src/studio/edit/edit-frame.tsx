import { cn } from "@rosesfield/ui/lib/cn"
import type { ReactElement } from "react"
import { appName } from "@/catalog/app-facts"
import { findCatalogApp } from "@/catalog/catalog-apps"
import { useIsRegularWindow } from "@/pieces/use-is-regular"
import { AppCanvas } from "@/screens/app/app-canvas"
import { AppStage } from "@/screens/app/app-stage"
import { EditBar } from "@/studio/edit/edit-bar"
import { editToolId } from "@/studio/edit/edit-tools"
import { PhotoView } from "@/studio/edit/photo-view"
import { ToolRow } from "@/studio/edit/tool-row"
import type { EditToolState } from "@/studio/edit/use-edit-tool"

export type DockPlace = "float" | "edge"

const docks = {
  float:
    "fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-220 flex-col items-center gap-2",
  edge: "sticky bottom-0 z-40 flex shrink-0 flex-col items-center gap-2 bg-canvas px-2 pt-2 pb-[calc(var(--spacing)*2+env(safe-area-inset-bottom))]",
} satisfies Record<DockPlace, string>

export function EditFrame({ state }: { state: EditToolState }): ReactElement {
  const isRegular = useIsRegularWindow()
  const place: DockPlace = isRegular ? "float" : "edge"
  const edit = findCatalogApp(editToolId) ?? state.app
  return (
    <div data-slot="edit-frame" className="flex h-full min-h-0 flex-col">
      <h1 className="sr-only">{appName(edit)}</h1>
      <div data-slot="edit-tools" className="shrink-0 px-4">
        <ToolRow current={state.tool.id} photo={state.photo.photo} />
      </div>
      <div data-slot="bar-stage" className="flex min-h-0 flex-1 pb-4">
        <AppStage
          app={state.app}
          kind="bar"
          hasWork={state.photo.photo !== null}
          scrollClassName={cn("px-4 pb-4", isRegular ? "pb-36" : "")}
        >
          <PhotoView photo={state.photo} />
          <AppCanvas
            app={state.app}
            order="newest-last"
            onUseInputs={state.useInputs}
          />
        </AppStage>
      </div>
      <div data-slot="prompt-dock" data-place={place} className={docks[place]}>
        <EditBar state={state} />
      </div>
    </div>
  )
}
