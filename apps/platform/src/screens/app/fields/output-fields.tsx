import type { AppListing } from "@rosesfield/contract"
import type { ReactElement } from "react"
import { settingIconOf } from "@/catalog/setting-registry"
import { hasCatalogText, t, tCatalog } from "@/copy/t"
import { NumberStepper } from "@/pieces/number-stepper"
import { aspectField } from "@/screens/app/app-form"
import { ChoiceField, type ChoiceItem } from "@/screens/app/fields/choice-field"
import { FieldFrame } from "@/screens/app/fields/field-frame"

export function aspectItems(app: AppListing): ChoiceItem[] {
  const output = app.output
  if (output.kind !== "image" && output.kind !== "video") {
    return []
  }
  return output.aspectRatios.options.map((ratio) => {
    const key = `choice.aspect.${ratio.replace(":", "-")}`
    return { value: ratio, label: hasCatalogText(key) ? tCatalog(key) : ratio }
  })
}

export function AspectField({
  app,
  value,
  onChange,
}: {
  app: AppListing
  value: string | null
  onChange: (ratio: string) => void
}): ReactElement | null {
  const items = aspectItems(app)
  if (items.length < 2) {
    return null
  }
  return (
    <ChoiceField
      label={t("field.aspect.label")}
      items={items}
      value={value ?? items[0]?.value ?? ""}
      setting={aspectField}
      onChange={onChange}
      note={null}
    />
  )
}

export function CountField({
  app,
  value,
  onChange,
}: {
  app: AppListing
  value: number
  onChange: (count: number) => void
}): ReactElement | null {
  const max = app.output.count.max
  if (max < 2) {
    return null
  }
  return (
    <FieldFrame
      caption={t("field.count.label")}
      isOptional={false}
      note={null}
      problem={undefined}
    >
      <NumberStepper
        value={value}
        fallback={app.output.count.default}
        min={1}
        max={max}
        step={1}
        unit=""
        label={t("field.count.label")}
        icon={settingIconOf("count", "count")}
        onChange={onChange}
      />
    </FieldFrame>
  )
}
