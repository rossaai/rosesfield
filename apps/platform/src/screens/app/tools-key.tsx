import { TabBarGenerate } from "@rosesfield/ui/components/tab-bar"
import type { ReactNode } from "react"
import { t } from "@/copy/t"
import { useAppToolsOpener, useHasAppToolsKey } from "@/pieces/app-tools"

export function ToolsKey({ onOpen }: { onOpen: () => void }): ReactNode {
  useAppToolsOpener(onOpen)
  const hasKey = useHasAppToolsKey()
  if (hasKey) {
    return null
  }
  return (
    <div
      data-slot="app-tools-key"
      className="sticky bottom-0 z-40 shrink-0 bg-canvas p-1 pb-[calc(var(--spacing)+env(safe-area-inset-bottom))] @regular:hidden"
    >
      <div className="flex h-12 items-center justify-center">
        <TabBarGenerate label={t("app.tools.open")} onClick={onOpen} />
      </div>
    </div>
  )
}
