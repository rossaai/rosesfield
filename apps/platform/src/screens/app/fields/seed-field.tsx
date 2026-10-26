import { Input } from "@rosesfield/ui/components/input"
import type { ReactElement } from "react"
import { t } from "@/copy/t"
import type { FieldValue } from "@/screens/app/app-form"
import { ChoiceControl } from "@/screens/app/fields/choice-field"
import { FieldFrame } from "@/screens/app/fields/field-frame"

const maxSeed = 2_147_483_647

type SeedFieldProps = {
  mode: "random" | "fixed"
  value: FieldValue
  onMode: (mode: "random" | "fixed") => void
  onChange: (value: FieldValue) => void
}

function seedOf(text: string): number | undefined {
  const value = Number(text)
  return Number.isInteger(value) && value >= 0 && value <= maxSeed
    ? value
    : undefined
}

export function SeedField(props: SeedFieldProps): ReactElement {
  const items: { value: "random" | "fixed"; label: string }[] = [
    { value: "random", label: t("field.seed.random") },
    { value: "fixed", label: t("field.seed.fixed") },
  ]
  return (
    <FieldFrame
      caption={t("field.seed.label")}
      isOptional={false}
      note={null}
      problem={undefined}
    >
      <ChoiceControl
        items={items}
        value={props.mode}
        onChange={(next) => props.onMode(next === "fixed" ? "fixed" : "random")}
        label={t("field.seed.label")}
      />
      {props.mode === "fixed" ? (
        <Input
          type="number"
          inputMode="numeric"
          min={0}
          max={maxSeed}
          aria-label={t("field.seed.label")}
          value={typeof props.value === "number" ? String(props.value) : ""}
          onChange={(event) => props.onChange(seedOf(event.target.value))}
          className="max-w-none"
        />
      ) : null}
    </FieldFrame>
  )
}
