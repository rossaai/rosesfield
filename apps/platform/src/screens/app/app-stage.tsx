import type { AppListing } from "@rosesfield/contract"
import { Canvas } from "@rosesfield/ui/components/canvas"
import { interaction } from "@rosesfield/ui/components/interaction"
import {
  SegmentedTab,
  SegmentedTabs,
  Tabs,
} from "@rosesfield/ui/components/tabs"
import { cn } from "@rosesfield/ui/lib/cn"
import { BookOpenIcon, FolderIcon } from "lucide-react"
import {
  createContext,
  type ReactElement,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react"
import { t } from "@/copy/t"
import { useAppRuns } from "@/screens/app/app-canvas"
import {
  CanvasCluster,
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

export function useStageTab(app: AppListing): {
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
  return { tab: shownTab(chosen, hasRuns), hasRuns, choose: setChosen }
}

type AppStageProps = {
  app: AppListing
  kind: StageKind
  children: ReactNode
  className?: string
  scrollRef?: (node: HTMLElement | null) => void
  scrollClassName?: string
}

export function AppStage(props: AppStageProps): ReactElement {
  const stage = useStageTab(props.app)
  const view = useCanvasViewControl()
  return (
    <Canvas
      label={t("app.canvas.label")}
      hasRuns={stage.hasRuns === true && stage.tab === "history"}
      cluster={
        <CanvasCluster
          control={view}
          form={props.kind === "bar" ? "menu" : "cluster"}
        />
      }
      {...(props.className === undefined ? {} : { className: props.className })}
      tabs={
        <Tabs
          value={stage.tab}
          onValueChange={(next) => {
            if (isStageTab(next)) {
              stage.choose(next)
            }
          }}
        >
          <SegmentedTabs aria-label={t("app.canvas.label")}>
            <SegmentedTab
              value="history"
              icon={<FolderIcon aria-hidden="true" />}
            >
              {t("app.tab.history")}
            </SegmentedTab>
            <SegmentedTab
              value="how"
              icon={<BookOpenIcon aria-hidden="true" />}
            >
              {t("app.tab.how")}
            </SegmentedTab>
          </SegmentedTabs>
        </Tabs>
      }
    >
      <div
        ref={stage.tab === "history" ? props.scrollRef : undefined}
        data-slot="app-stage-scroll"
        className={cn(
          "h-full overflow-y-auto",
          interaction.ringRoomTop,
          interaction.ringScroll,
          props.scrollClassName
        )}
      >
        {stage.tab === "how" ? (
          <HowItWorks app={props.app} kind={props.kind} />
        ) : (
          <CanvasViewProvider control={view}>
            {props.children}
          </CanvasViewProvider>
        )}
      </div>
    </Canvas>
  )
}
