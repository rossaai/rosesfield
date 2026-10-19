import { SegmentedControl } from "@rosesfield/ui/components/segmented-control"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@rosesfield/ui/components/select"
import {
  type ReactElement,
  type RefObject,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react"
import { FieldFrame } from "@/screens/app/fields/field-frame"

export type ChoiceItem = { value: string; label: string }

type ChoiceControlProps = {
  label: string
  items: readonly ChoiceItem[]
  value: string
  onChange: (value: string) => void
  register?: (focus: () => void) => void
}

export const segmentLimit = 4

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
          items={props.items}
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

export function ChoiceControl(props: ChoiceControlProps): ReactElement {
  if (props.items.length <= segmentLimit) {
    return <SegmentsOrSelect {...props} />
  }
  return <ChoiceSelect {...props} />
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
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {props.items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

type ChoiceFieldProps = ChoiceControlProps & { note: string | null }

export function ChoiceField(props: ChoiceFieldProps): ReactElement {
  return (
    <FieldFrame
      caption={props.label}
      isOptional={false}
      note={props.note}
      problem={undefined}
    >
      <ChoiceControl {...props} />
    </FieldFrame>
  )
}
