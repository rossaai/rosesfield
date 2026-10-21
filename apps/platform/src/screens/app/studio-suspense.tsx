import { Skeleton } from "@rosesfield/ui/components/skeleton"
import { type ReactElement, type ReactNode, Suspense } from "react"
import {
  useAppToolsLoading,
  useAppToolsScreen,
  useAppToolsSettled,
} from "@/pieces/app-tools"

function StudioLoading(): ReactElement {
  useAppToolsLoading()
  return <Skeleton className="m-s4 h-s12" />
}

function StudioSettled(): null {
  useAppToolsSettled()
  return null
}

export function StudioSuspense({
  children,
}: {
  children: ReactNode
}): ReactElement {
  useAppToolsScreen()
  return (
    <Suspense fallback={<StudioLoading />}>
      {children}
      <StudioSettled />
    </Suspense>
  )
}
