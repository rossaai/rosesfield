import type { AppListing } from "@rosesfield/contract"
import { Canvas } from "@rosesfield/ui/components/canvas"
import { interaction } from "@rosesfield/ui/components/interaction"
import { Tabs, TabsList, TabsTrigger } from "@rosesfield/ui/components/tabs"
import { cn } from "@rosesfield/ui/lib/cn"
import { BookOpenIcon, FolderIcon } from "lucide-react"
import {
  createContext,
  type ReactElement,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react"
import { t } from "@/copy/t"
import { useCanvasFit } from "@/pieces/use-canvas-fit"
import { useIsRegularWindow } from "@/pieces/use-is-regular"
import { useAppRuns } from "@/screens/app/app-canvas"
import {
  CanvasViewMenu,
  CanvasViewProvider,
  useCanvasViewControl,
} from "@/screens/app/canvas-view"
import { HowItWorks, type StageKind } from "@/screens/app/how-it-works"

export type StageTab = "history" | "how"

export const stageTabs: readonly StageTab[] = ["history", "how"]

function isStageTab(value: unknown): value is StageTab {
  return stageTabs.some((tab) => tab === value)
}

const AskedTabContext = createContext<StageTab | null>(null)

export function AskedTab({
  tab,
  children,
}: {
  tab: StageTab | null
  children: ReactNode
}): ReactElement {
  return (
    <AskedTabContext.Provider value={tab}>{children}</AskedTabContext.Provider>
  )
}

export function shownTab(
  chosen: StageTab | null,
  hasRuns: boolean | null
): StageTab {
  return chosen ?? (hasRuns === false ? "how" : "history")
}

export function useStageTab(
  app: AppListing,
  hasWork: boolean
): {
  tab: StageTab
  hasRuns: boolean | null
  choose: (tab: StageTab) => void
} {
  const runs = useAppRuns(app)
  const count = runs.runs.length
  const hasRuns = runs.isPending ? null : count > 0
  const asked = useContext(AskedTabContext)
  const [chosen, setChosen] = useState<StageTab | null>(asked)
  const [seen, setSeen] = useState(count)
  useEffect(() => {
    if (count > seen) {
      setChosen(null)
    }
    setSeen(count)
  }, [count, seen])
  return {
    tab: shownTab(chosen, hasWork ? true : hasRuns),
    hasRuns,
    choose: setChosen,
  }
}

type AppStageProps = {
  app: AppListing
  kind: StageKind
  children: ReactNode
  hasWork?: boolean
  className?: string
  scrollRef?: (node: HTMLElement | null) => void
  scrollClassName?: string
}

function StageTabs({
  stage,
  view,
}: {
  stage: ReturnType<typeof useStageTab>
  view: ReactNode
}): ReactElement {
  return (
    <div
      data-slot="app-stage-tabs"
      className="flex min-w-0 flex-1 items-center justify-between gap-s2"
    >
      <Tabs
        value={stage.tab}
        onValueChange={(next) => {
          if (isStageTab(next)) {
            stage.choose(next)
          }
        }}
      >
        <TabsList aria-label={t("app.canvas.label")}>
          <TabsTrigger value="history">
            <FolderIcon aria-hidden="true" />
            {t("app.tab.history")}
          </TabsTrigger>
          <TabsTrigger value="how">
            <BookOpenIcon aria-hidden="true" />
            {t("app.tab.how")}
          </TabsTrigger>
        </TabsList>
      </Tabs>
      {view}
    </div>
  )
}

export function AppStage(props: AppStageProps): ReactElement {
  const stage = useStageTab(props.app, props.hasWork ?? false)
  const view = useCanvasViewControl()
  const fit = useCanvasFit()
  const outerRef = props.scrollRef
  const scrollRef = useCallback(
    (node: HTMLElement | null): void => {
      fit.ref(node)
      outerRef?.(node)
    },
    [fit.ref, outerRef]
  )
  const isRegular = useIsRegularWindow()
  const hasView = stage.hasRuns === true && stage.tab === "history"
  const menu = <CanvasViewMenu control={view} />
  return (
    <Canvas
      label={t("app.canvas.label")}
      hasRuns={isRegular && hasView}
      cluster={isRegular ? menu : undefined}
      {...(props.className === undefined ? {} : { className: props.className })}
      tabs={
        <StageTabs stage={stage} view={!isRegular && hasView ? menu : null} />
      }
    >
      <div
        ref={stage.tab === "history" ? scrollRef : undefined}
        data-slot="app-stage-scroll"
        className={cn(
          "h-full overflow-y-auto",
          interaction.ringRoomTop,
          interaction.ringScroll,
          interaction.fadeEnd,
          props.scrollClassName
        )}
      >
        {stage.tab === "how" ? (
          <HowItWorks app={props.app} />
        ) : (
          <CanvasViewProvider control={view}>
            {props.children}
          </CanvasViewProvider>
        )}
      </div>
    </Canvas>
  )
}
