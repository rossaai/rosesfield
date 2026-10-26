import { SegmentedControl } from "@rosesfield/ui/components/segmented-control"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@rosesfield/ui/components/select"
import { Switch } from "@rosesfield/ui/components/switch"
import {
  type ReactElement,
  type ReactNode,
  type RefObject,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react"
import { withOptionIcons } from "@/catalog/setting-registry"
import type { FieldProblem } from "@/screens/app/app-form"
import { FieldFrame } from "@/screens/app/fields/field-frame"
import { SwitchRow } from "@/screens/app/fields/toggle-field"
import { booleanPairOf, controlOf } from "@/screens/app/settings-plan"

export type ChoiceItem = { value: string; label: string; icon?: ReactNode }

type ChoiceControlProps = {
  label: string
  items: readonly ChoiceItem[]
  value: string
  onChange: (value: string) => void
  register?: (focus: () => void) => void
  notSet?: string
  setting?: string
}

function overflowOf(frame: HTMLElement): number {
  const labels = frame.querySelectorAll<HTMLElement>(
    "[data-slot='segment-label']"
  )
  return Math.max(
    0,
    ...Array.from(labels, (label) => label.scrollWidth - label.clientWidth)
  )
}

export function useSegmentsFit(
  frame: RefObject<HTMLElement | null>,
  labels: readonly string[]
): boolean {
  const key = labels.join("\n")
  const [fit, setFit] = useState({ key, fits: true })
  const needed = useRef(0)
  const count = labels.length
  const fits = fit.key === key ? fit.fits : true
  useLayoutEffect(() => {
    const element = frame.current
    if (element === null) {
      return
    }
    const measure = (): void => {
      const width = element.clientWidth
      if (!fits) {
        setFit({ key, fits: width >= needed.current })
        return
      }
      const overflow = overflowOf(element)
      if (overflow > 0) {
        needed.current = width + overflow * count
        setFit({ key, fits: false })
      }
    }
    measure()
    const fonts = typeof document === "undefined" ? undefined : document.fonts
    fonts?.addEventListener("loadingdone", measure)
    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure)
    observer?.observe(element)
    return () => {
      fonts?.removeEventListener("loadingdone", measure)
      observer?.disconnect()
    }
  }, [frame, key, count, fits])
  return fits
}

function SegmentsOrSelect(props: ChoiceControlProps): ReactElement {
  const frame = useRef<HTMLDivElement>(null)
  const fits = useSegmentsFit(
    frame,
    props.items.map((item) => item.label)
  )
  return (
    <div ref={frame} className="min-w-0">
      {fits ? (
        <SegmentedControl
          items={props.items.map(({ value, label }) => ({ value, label }))}
          value={props.value}
          onValueChange={props.onChange}
          label={props.label}
          className="max-w-none"
        />
      ) : (
        <ChoiceSelect {...props} />
      )}
    </div>
  )
}

function withIcons(given: ChoiceControlProps): ChoiceControlProps {
  return given.setting === undefined
    ? given
    : { ...given, items: withOptionIcons(given.setting, given.items) }
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
    case "segmented":
      return <SegmentsOrSelect {...props} />
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
        aria-label={props.label}
        className="max-w-none"
      >
        <SelectValue>
          {(value: unknown) => {
            const item = props.items.find((one) => one.value === value)
            if (item === undefined) {
              return props.notSet ?? ""
            }
            return item.icon === undefined ? (
              item.label
            ) : (
              <span className="flex min-w-0 items-center gap-s1_5 [&_svg]:glyph-small">
                <span aria-hidden="true" className="flex">
                  {item.icon}
                </span>
                <span className="truncate">{item.label}</span>
              </span>
            )
          }}
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
