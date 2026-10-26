import { Button, IconButton } from "@rosesfield/ui/components/button"
import { Input } from "@rosesfield/ui/components/input"
import {
  ViewMenu as KernelViewMenu,
  type ViewFacet,
  type ViewSize,
  ViewTrigger,
  type ViewTriggerForm,
} from "@rosesfield/ui/components/view-menu"
import { cn } from "@rosesfield/ui/lib/cn"
import { SearchIcon } from "lucide-react"
import {
  type ReactElement,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react"
import { t } from "@/copy/t"
import { useIsRegularWindow } from "@/pieces/use-is-regular"
import { tileSizes } from "@/pieces/view/tile-scale"
import type { PlaceView } from "@/pieces/view/use-view"

export type FilterChoice = { value: string; label: string; picture: ReactNode }

export type FilterGroup = {
  id: string
  name: string
  icon: ReactNode
  choices: readonly FilterChoice[]
  value: string
  onChoose: (value: string) => void
}

export type ViewMenuProps = {
  view: Pick<PlaceView, "layout" | "size" | "setLayout" | "setSize">
  hasLayout?: boolean
  hasListSize?: boolean
  groups?: readonly FilterGroup[]
  isLoading?: boolean
}

function facetOf(group: FilterGroup): ViewFacet {
  return {
    id: group.id,
    label: group.name,
    value: group.value,
    options: group.choices.map((choice) => ({
      value: choice.value,
      label: choice.label,
      ...(choice.picture === null ? {} : { lead: choice.picture }),
    })),
    onValueChange: group.onChoose,
  }
}

export function ViewMenu(props: ViewMenuProps): ReactElement {
  const isRegular = useIsRegularWindow()
  const trigger: ViewTriggerForm = isRegular ? "label" : "icon"
  if (props.isLoading === true) {
    return (
      <ViewTrigger
        label={t("app.canvas.view")}
        trigger={trigger}
        disabled={true}
      />
    )
  }
  const { view } = props
  const hasLayout = props.hasLayout ?? true
  const shared = {
    label: t("app.canvas.view"),
    trigger,
    filterLabel: t("library.filter"),
    facets: (props.groups ?? []).map(facetOf),
  }
  const size: ViewSize = {
    label: t("library.view.size"),
    value: view.size,
    min: tileSizes.min,
    max: tileSizes.max,
    onValueChange: view.setSize,
  }
  if (!hasLayout) {
    return <KernelViewMenu {...shared} size={size} />
  }
  return (
    <KernelViewMenu
      {...shared}
      layoutLabel={t("library.view.label")}
      listLabel={t("library.view.list")}
      gridLabel={t("library.view.grid")}
      layout={view.layout}
      onLayoutChange={view.setLayout}
      {...(view.layout === "grid" || (isRegular && props.hasListSize === true)
        ? { size }
        : {})}
    />
  )
}

export function viewRowClassOf(isRegular: boolean): string {
  return isRegular
    ? "flex min-w-0 flex-1 items-center justify-between gap-s3"
    : "grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] items-center justify-items-start gap-x-s3 gap-y-s2"
}

export type ViewBarProps = ViewMenuProps & {
  view: PlaceView
  searchLabel: string
}

function SearchButton({
  isShown,
  onPress,
}: {
  isShown: boolean
  onPress: () => void
}): ReactElement {
  const isRegular = useIsRegularWindow()
  const label = t("library.search.open")
  return isRegular ? (
    <Button
      data-slot="view-search-open"
      tone="quiet"
      size="dense"
      aria-expanded={isShown}
      onClick={onPress}
    >
      <SearchIcon aria-hidden="true" />
      {label}
    </Button>
  ) : (
    <IconButton
      data-slot="view-search-open"
      label={label}
      tone="quiet"
      size="dense"
      aria-expanded={isShown}
      onClick={onPress}
    >
      <SearchIcon aria-hidden="true" />
    </IconButton>
  )
}

export function ViewBar(props: ViewBarProps): ReactElement {
  const { view } = props
  const isRegular = useIsRegularWindow()
  const [isOpen, setOpen] = useState(view.words !== "")
  const field = useRef<HTMLInputElement>(null)
  const wantsFocus = useRef(false)
  const isShown = isOpen || view.words !== ""
  useEffect(() => {
    if (isShown && wantsFocus.current) {
      wantsFocus.current = false
      field.current?.focus()
    }
  }, [isShown])
  return (
    <>
      {isShown ? (
        <Input
          ref={field}
          type="search"
          data-slot="view-search"
          aria-label={props.searchLabel}
          placeholder={props.searchLabel}
          value={view.words}
          onChange={(event) => view.setWords(event.target.value)}
          className={cn(
            "h-button-dense",
            isRegular
              ? "w-field-max"
              : "order-last col-span-full max-w-none basis-full"
          )}
        />
      ) : null}
      <div data-slot="view-bar" className="flex items-center gap-s2">
        <SearchButton
          isShown={isShown}
          onPress={() => {
            if (isShown) {
              setOpen(false)
              view.setWords("")
              return
            }
            wantsFocus.current = true
            setOpen(true)
          }}
        />
        <ViewMenu {...props} />
      </div>
    </>
  )
}
