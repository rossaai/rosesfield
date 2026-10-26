import type { AppListing } from "@rosesfield/contract"
import { Tabs, TabsList, TabsTrigger } from "@rosesfield/ui/components/tabs"
import type { ReactElement } from "react"
import { CatalogPicker } from "@/screens/app/hosted/catalog-picker"
import { HostedFields } from "@/screens/app/hosted/hosted-fields"
import { withoutModelInput } from "@/screens/app/hosted/task-panel"
import { InputsPanel } from "@/screens/app/inputs-panel"
import { tThreeD } from "@/studio/three-d/copy.en"
import {
  type ThreeDTab,
  tabKeys,
  threeDTabs,
} from "@/studio/three-d/three-d-tabs"
import type { ThreeDScreen } from "@/studio/three-d/use-three-d-screen"

type TabsView = Pick<ThreeDScreen, "tab" | "tabs" | "setTab">

function isThreeDTab(value: unknown): value is ThreeDTab {
  return threeDTabs.some((tab) => tab === value)
}

export function ModeTabs({ screen }: { screen: TabsView }): ReactElement {
  return (
    <Tabs
      value={screen.tab}
      onValueChange={(next) => {
        if (isThreeDTab(next)) {
          screen.setTab(next)
        }
      }}
    >
      <TabsList aria-label={tThreeD("threeD.tabs.label")}>
        {screen.tabs.map((one) => (
          <TabsTrigger key={one} value={one}>
            {tThreeD(tabKeys[one])}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}

export function tabRowOf(screen: TabsView): ReactElement | undefined {
  return screen.tabs.length > 1 ? <ModeTabs screen={screen} /> : undefined
}

export function ThreeDPanel({
  app,
  screen,
}: {
  app: AppListing
  screen: ThreeDScreen
}): ReactElement {
  const { hosted, state, tabModels } = screen
  const tabHosted = { ...hosted, models: tabModels }
  const model = <CatalogPicker hosted={tabHosted} place="row" />
  return (
    <div data-slot="three-d-parts" className="flex flex-1 flex-col gap-s4">
      {hosted.fields === null ? (
        <InputsPanel
          app={withoutModelInput(app)}
          form={state.form}
          lastSeed={state.lastSeed}
          model={model}
        />
      ) : (
        <HostedFields
          fields={hosted.fields}
          form={state.form}
          app={app}
          model={model}
        />
      )}
    </div>
  )
}
