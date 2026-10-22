import {
  ActivityIcon,
  CircleAlertIcon,
  LayoutGridIcon,
  LoaderIcon,
} from "lucide-react"
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
  type ViewClusterProps,
  type ViewLayout,
  ViewMenu,
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

const statePictures = {
  all: <LayoutGridIcon />,
  working: <LoaderIcon />,
  failed: <CircleAlertIcon />,
} satisfies Record<StateChoice, ReactNode>

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
      picture: statePictures[choice],
    })),
    value: control.state,
    onChoose: (value) => {
      if (isStateChoice(value)) {
        control.setState(value)
      }
    },
  }
}

function clusterProps(control: CanvasViewControl): ViewClusterProps {
  return {
    layout: control.layout,
    onLayout: control.setLayout,
    size: control.size,
    onSize: control.setSize,
    groups: [stateGroup(control)],
  }
}

export function CanvasCluster({
  control,
  form,
}: {
  control: CanvasViewControl
  form: "cluster" | "menu"
}): ReactElement {
  return form === "cluster" ? (
    <ViewCluster {...clusterProps(control)} />
  ) : (
    <ViewMenu {...clusterProps(control)} />
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
