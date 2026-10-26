import type { FieldRole } from "@rosesfield/catalog/comfy"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@rosesfield/ui/components/select"
import { Switch } from "@rosesfield/ui/components/switch"
import { type ReactElement, useEffect, useRef } from "react"
import {
  isAspectSetting,
  settingIconOf,
  withOptionIcons,
  withShapes,
} from "@/catalog/setting-registry"
import type { FieldProblem } from "@/screens/app/app-form"
import { FieldFrame } from "@/screens/app/fields/field-frame"
import { SwitchRow } from "@/screens/app/fields/toggle-field"
import { booleanPairOf, controlOf } from "@/screens/app/settings-plan"

export type ChoiceItem = { value: string; label: string; icon?: ReactElement }

type ChoiceControlProps = {
  label: string
  items: readonly ChoiceItem[]
  value: string
  onChange: (value: string) => void
  setting: string
  role?: FieldRole | null
  register?: (focus: () => void) => void
  notSet?: string
}

function withIcons(given: ChoiceControlProps): ChoiceControlProps {
  return {
    ...given,
    items: isAspectSetting(given.setting, given.role ?? null)
      ? withShapes(given.items)
      : withOptionIcons(given.setting, given.items),
  }
}

function leadIconOf(props: ChoiceControlProps): ReactElement {
  const chosen = props.items.find((one) => one.value === props.value)
  return chosen?.icon === undefined || chosen.value === "auto"
    ? settingIconOf(props.setting, props.role ?? null)
    : chosen.icon
}

function ChoiceSwitch(props: ChoiceControlProps): ReactElement | null {
  const pair = booleanPairOf(props.items)
  if (pair === null) {
    return null
  }
  return (
    <Switch
      aria-label={props.label}
      checked={props.value === pair.on}
      onCheckedChange={(checked) =>
        props.onChange(checked ? pair.on : pair.off)
      }
    />
  )
}

export function ChoiceControl(given: ChoiceControlProps): ReactElement | null {
  const props = withIcons(given)
  switch (controlOf({ kind: "choice", options: props.items })) {
    case "switch":
      return <ChoiceSwitch {...props} />
    default:
      return <ChoiceSelect {...props} />
  }
}

function ChoiceSelect(props: ChoiceControlProps): ReactElement {
  const trigger = useRef<HTMLButtonElement>(null)
  const { register } = props
  useEffect(() => {
    register?.(() => trigger.current?.focus())
  }, [register])
  return (
    <Select
      items={props.items}
      value={props.value}
      onValueChange={(next) => {
        const item = props.items.find((one) => one.value === next)
        if (item !== undefined) {
          props.onChange(item.value)
        }
      }}
    >
      <SelectTrigger
        ref={trigger}
        icon={leadIconOf(props)}
        aria-label={props.label}
        className="max-w-none"
      >
        <SelectValue>
          {(value: unknown) =>
            props.items.find((one) => one.value === value)?.label ??
            props.notSet ??
            ""
          }
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {props.items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.icon === undefined ? null : (
              <span aria-hidden="true" className="flex [&_svg]:glyph-small">
                {item.icon}
              </span>
            )}
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

type ChoiceFieldProps = ChoiceControlProps & {
  note: string | null
  problem?: FieldProblem | undefined
}

export function ChoiceField(props: ChoiceFieldProps): ReactElement {
  const pair = booleanPairOf(props.items)
  if (pair !== null) {
    return (
      <SwitchRow
        label={props.label}
        checked={props.value === pair.on}
        onCheckedChange={(checked) =>
          props.onChange(checked ? pair.on : pair.off)
        }
      />
    )
  }
  return (
    <FieldFrame
      caption={props.label}
      isOptional={false}
      note={props.note}
      problem={props.problem}
    >
      <ChoiceControl {...props} />
    </FieldFrame>
  )
}
