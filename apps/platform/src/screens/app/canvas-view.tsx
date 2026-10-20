import { Button } from "@rosesfield/ui/components/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@rosesfield/ui/components/popover"
import { ActivityIcon, LayoutGridIcon } from "lucide-react"
import {
  createContext,
  type ReactElement,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react"
import { t } from "@/copy/t"
import type { StateChoice } from "@/screens/history/history-filters"
import {
  type FilterGroup,
  tileSizes,
  ViewCluster,
  type ViewLayout,
} from "@/screens/library/view-cluster"

export type CanvasView = {
  layout: ViewLayout
  size: number
  state: StateChoice
  clear: () => void
}

type CanvasViewControl = CanvasView & {
  setLayout: (layout: ViewLayout) => void
  setSize: (size: number) => void
  setState: (state: StateChoice) => void
}

const listView: CanvasView = {
  layout: "list",
  size: tileSizes.initial,
  state: "all",
  clear: () => undefined,
}

const CanvasViewContext = createContext<CanvasView>(listView)

const stateChoices: readonly StateChoice[] = ["all", "working", "failed"]

const stateKeys = {
  all: "kind.all",
  working: "history.filter.working",
  failed: "history.filter.failed",
} as const satisfies Record<StateChoice, string>

function isStateChoice(value: string): value is StateChoice {
  return stateChoices.some((choice) => choice === value)
}

export function useCanvasView(): CanvasView {
  return useContext(CanvasViewContext)
}

export function useCanvasViewControl(): CanvasViewControl {
  const [layout, setLayout] = useState<ViewLayout>("list")
  const [size, setSize] = useState<number>(tileSizes.initial)
  const [state, setState] = useState<StateChoice>("all")
  const clear = useCallback(() => setState("all"), [])
  return {
    layout,
    size,
    state,
    clear,
    setLayout,
    setSize,
    setState,
  }
}

export function stateGroup(control: CanvasViewControl): FilterGroup {
  return {
    id: "state",
    name: t("history.filter.state"),
    icon: <ActivityIcon />,
    choices: stateChoices.map((choice) => ({
      value: choice,
      label: t(stateKeys[choice]),
    })),
    value: control.state,
    onChoose: (value) => {
      if (isStateChoice(value)) {
        control.setState(value)
      }
    },
  }
}

function Cluster({ control }: { control: CanvasViewControl }): ReactElement {
  return (
    <ViewCluster
      layout={control.layout}
      onLayout={control.setLayout}
      size={control.size}
      onSize={control.setSize}
      groups={[stateGroup(control)]}
    />
  )
}

export function CanvasCluster({
  control,
  form,
}: {
  control: CanvasViewControl
  form: "cluster" | "menu"
}): ReactElement {
  if (form === "cluster") {
    return <Cluster control={control} />
  }
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            data-slot="canvas-view"
            size="recreate"
            tone="quiet"
            className="rounded-dense border border-(--line) px-2"
          >
            <LayoutGridIcon aria-hidden="true" />
            {t("library.view.label")}
          </Button>
        }
      />
      <PopoverContent align="end" side="bottom" sideOffset={8}>
        <div className="flex items-center gap-2">
          <Cluster control={control} />
        </div>
      </PopoverContent>
    </Popover>
  )
}

export function CanvasViewProvider({
  control,
  children,
}: {
  control: CanvasViewControl
  children: ReactNode
}): ReactElement {
  const { layout, size, state, clear } = control
  const view = useMemo(
    () => ({ layout, size, state, clear }),
    [layout, size, state, clear]
  )
  return (
    <CanvasViewContext.Provider value={view}>
      {children}
    </CanvasViewContext.Provider>
  )
}
