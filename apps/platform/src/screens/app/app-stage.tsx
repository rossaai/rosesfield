import type { AppListing } from "@rosesfield/contract"
import { Badge } from "@rosesfield/ui/components/badge"
import { Canvas } from "@rosesfield/ui/components/canvas"
import { interaction } from "@rosesfield/ui/components/interaction"
import { Tabs, TabsList, TabsTrigger } from "@rosesfield/ui/components/tabs"
import { cn } from "@rosesfield/ui/lib/cn"
import { BookOpenIcon, FolderIcon, LibraryIcon } from "lucide-react"
import {
  createContext,
  type ReactElement,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react"
import { type AppExample, examplesOf } from "@/catalog/app-examples"
import { appBadge, appName } from "@/catalog/app-facts"
import { t } from "@/copy/t"
import { useCanvasFit } from "@/pieces/use-canvas-fit"
import { useIsRegularWindow } from "@/pieces/use-is-regular"
import { type PlaceView, useView } from "@/pieces/view/use-view"
import { ViewBar, viewRowClassOf } from "@/pieces/view/view-bar"
import { useAppRuns } from "@/screens/app/app-canvas"
import { AppLibrary } from "@/screens/app/app-library"
import { CanvasViewProvider } from "@/screens/app/canvas-view"
import { HowItWorks, type StageKind } from "@/screens/app/how-it-works"
import { PhoneTitlePortal, ScreenTitle } from "@/shell/screen-header"

export type StageTab = "history" | "library" | "how"

export const stageTabs: readonly StageTab[] = ["history", "library", "how"]

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
  hasRuns: boolean | null,
  hasLibrary = false
): StageTab {
  if (chosen === "library" && !hasLibrary) {
    return hasRuns === false ? "how" : "history"
  }
  if (chosen !== null) {
    return chosen
  }
  if (hasRuns !== false) {
    return "history"
  }
  return hasLibrary ? "library" : "how"
}

export function useStageTab(
  app: AppListing,
  hasWork: boolean,
  hasLibrary = false
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
  const [seen, setSeen] = useState<number | null>(runs.isPending ? null : count)
  useEffect(() => {
    if (runs.isPending) {
      return
    }
    if (seen !== null && count > seen) {
      setChosen(null)
    }
    setSeen(count)
  }, [count, seen, runs.isPending])
  return {
    tab: shownTab(chosen, hasWork ? true : hasRuns, hasLibrary),
    hasRuns,
    choose: setChosen,
  }
}

export type StageLayouts = "grid-and-list" | "list" | "none"

type AppStageProps = {
  app: AppListing
  kind: StageKind
  children: ReactNode
  hasWork?: boolean
  hasTitle?: boolean
  layouts?: StageLayouts
  className?: string
  scrollRef?: (node: HTMLElement | null) => void
  scrollClassName?: string
}

function AppTitle({ app }: { app: AppListing }): ReactNode {
  const badge = appBadge(app)
  return badge === null ? (
    appName(app)
  ) : (
    <span data-slot="app-title" className="inline-flex items-center gap-s2">
      {appName(app)}
      <Badge kind="featured">{badge}</Badge>
    </span>
  )
}

function StageTitle({ app }: { app: AppListing }): ReactNode {
  const isRegular = useIsRegularWindow()
  return isRegular ? (
    <ScreenTitle title={<AppTitle app={app} />} />
  ) : (
    <PhoneTitlePortal title={<AppTitle app={app} />} />
  )
}

function StageTabs({
  stage,
  title,
  view,
  hasLibrary,
}: {
  stage: ReturnType<typeof useStageTab>
  title: ReactNode
  view: ReactNode
  hasLibrary: boolean
}): ReactElement {
  const isRegular = useIsRegularWindow()
  const hasIcons = isRegular || !hasLibrary
  return (
    <div data-slot="app-stage-tabs" className={viewRowClassOf(isRegular)}>
      <div
        data-slot="app-stage-lead"
        className="flex min-w-0 items-center gap-s4"
      >
        {title}
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
              {hasIcons ? <FolderIcon aria-hidden="true" /> : null}
              {t("app.tab.history")}
            </TabsTrigger>
            {hasLibrary ? (
              <TabsTrigger value="library">
                {hasIcons ? <LibraryIcon aria-hidden="true" /> : null}
                {t("app.tab.library")}
              </TabsTrigger>
            ) : null}
            <TabsTrigger value="how">
              {hasIcons ? <BookOpenIcon aria-hidden="true" /> : null}
              {t("app.tab.how")}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      {view}
    </div>
  )
}

function useStageView(layouts: StageLayouts): PlaceView {
  const chosen = useView("app")
  return layouts === "list" ? { ...chosen, layout: "list" } : chosen
}

function StageBody({
  app,
  tab,
  examples,
  children,
}: {
  app: AppListing
  tab: StageTab
  examples: readonly AppExample[]
  children: ReactNode
}): ReactNode {
  switch (tab) {
    case "how":
      return <HowItWorks app={app} />
    case "library":
      return <AppLibrary app={app} examples={examples} />
    case "history":
      return children
  }
}

export function AppStage(props: AppStageProps): ReactElement {
  const examples = examplesOf(props.app.id)
  const hasLibrary = examples.length > 0
  const stage = useStageTab(props.app, props.hasWork ?? false, hasLibrary)
  const layouts = props.layouts ?? "grid-and-list"
  const view = useStageView(layouts)
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
  const hasView =
    layouts !== "none" && stage.hasRuns === true && stage.tab === "history"
  const menu = (
    <ViewBar
      view={view}
      searchLabel={t("app.search.label")}
      hasLayout={layouts === "grid-and-list"}
      hasListSize={true}
    />
  )
  return (
    <Canvas
      label={t("app.canvas.label")}
      hasRuns={isRegular && hasView}
      cluster={isRegular ? menu : undefined}
      {...(props.className === undefined ? {} : { className: props.className })}
      tabs={
        <StageTabs
          stage={stage}
          title={
            props.hasTitle === false ? null : <StageTitle app={props.app} />
          }
          view={!isRegular && hasView ? menu : null}
          hasLibrary={hasLibrary}
        />
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
        <StageBody app={props.app} tab={stage.tab} examples={examples}>
          <CanvasViewProvider view={view}>{props.children}</CanvasViewProvider>
        </StageBody>
      </div>
    </Canvas>
  )
}
