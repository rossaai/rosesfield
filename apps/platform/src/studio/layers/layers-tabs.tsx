import { Tabs, TabsList, TabsTrigger } from "@rosesfield/ui/components/tabs"
import type { ReactElement } from "react"
import { tCatalog } from "@/copy/t"
import {
  isLayersMode,
  layersModes,
  modeInput,
} from "@/studio/layers/layers-modes"
import type { LayersState } from "@/studio/layers/use-layers-screen"

export function LayersTabs({
  state,
}: {
  state: Pick<LayersState, "mode" | "form">
}): ReactElement {
  return (
    <Tabs
      value={state.mode}
      onValueChange={(next) => {
        if (isLayersMode(next)) {
          state.form.setInput(modeInput, next)
        }
      }}
    >
      <TabsList aria-label={tCatalog("layers.input.mode.label")}>
        {layersModes.map((one) => (
          <TabsTrigger key={one} value={one}>
            {tCatalog(`layers.choice.mode.${one}`)}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
