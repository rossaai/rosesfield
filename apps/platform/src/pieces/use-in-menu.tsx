import type { AssetKind } from "@rosesfield/contract"
import {
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@rosesfield/ui/components/dropdown-menu"
import { useNavigate } from "@tanstack/react-router"
import type { ReactElement } from "react"
import { appName, appsTaking } from "@/catalog/app-facts"
import { catalogApps } from "@/catalog/catalog-apps"
import { t } from "@/copy/t"

type UseInItemsProps = {
  kind: AssetKind | "character"
  useId: string
}

export function useUseInItems({
  kind,
  useId,
}: UseInItemsProps): ReactElement[] {
  const navigate = useNavigate()
  return appsTaking(catalogApps, kind).map((app) => (
    <DropdownMenuItem
      key={app.id}
      onClick={() =>
        void navigate({
          to: "/apps/$appId",
          params: { appId: app.id },
          search: { use: useId },
        })
      }
    >
      {appName(app)}
    </DropdownMenuItem>
  ))
}

export function UseInSubmenu(props: UseInItemsProps): ReactElement {
  const items = useUseInItems(props)
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger disabled={items.length === 0}>
        {t("output.useIn")}
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>{items}</DropdownMenuSubContent>
    </DropdownMenuSub>
  )
}
