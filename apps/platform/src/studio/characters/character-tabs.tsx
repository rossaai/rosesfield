import { Tabs, TabsList, TabsTrigger } from "@rosesfield/ui/components/tabs"
import type { ReactElement } from "react"
import { t } from "@/copy/t"

export type MakeMode = "photos" | "traits"

const makeModes: readonly MakeMode[] = ["photos", "traits"]

export function isMakeMode(value: unknown): value is MakeMode {
  return makeModes.some((mode) => mode === value)
}

export function CharacterTabs({
  mode,
  onChange,
}: {
  mode: MakeMode
  onChange: (mode: MakeMode) => void
}): ReactElement {
  return (
    <Tabs
      value={mode}
      onValueChange={(next) => {
        if (isMakeMode(next)) {
          onChange(next)
        }
      }}
    >
      <TabsList aria-label={t("characters.new.mode.label")}>
        {makeModes.map((one) => (
          <TabsTrigger key={one} value={one}>
            {t(`characters.new.mode.${one}`)}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
