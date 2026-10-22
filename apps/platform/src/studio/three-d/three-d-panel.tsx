import type { AppListing } from "@rosesfield/contract"
import { ModeStrip, ModeTab, Tabs } from "@rosesfield/ui/components/tabs"
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

function isThreeDTab(value: unknown): value is ThreeDTab {
  return threeDTabs.some((tab) => tab === value)
}

export function ModeTabs({
  screen,
}: {
  screen: Pick<ThreeDScreen, "tab" | "tabs" | "setTab">
}): ReactElement {
  return (
    <Tabs
      value={screen.tab}
      onValueChange={(next) => {
        if (isThreeDTab(next)) {
          screen.setTab(next)
        }
      }}
    >
      <ModeStrip aria-label={tThreeD("threeD.tabs.label")}>
        {screen.tabs.map((one) => (
          <ModeTab key={one} value={one}>
            {tThreeD(tabKeys[one])}
          </ModeTab>
        ))}
      </ModeStrip>
    </Tabs>
  )
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
  return (
    <div data-slot="three-d-parts" className="flex flex-1 flex-col gap-s4">
      <CatalogPicker hosted={tabHosted} place="row" />
      {hosted.fields === null ? (
        <InputsPanel
          app={withoutModelInput(app)}
          form={state.form}
          lastSeed={state.lastSeed}
        />
      ) : (
        <HostedFields fields={hosted.fields} form={state.form} />
      )}
    </div>
  )
}
