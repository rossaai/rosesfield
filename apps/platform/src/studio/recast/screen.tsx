import { Navigate } from "@tanstack/react-router"
import type { ReactElement } from "react"
import type { StudioScreenProps } from "@/screens/app/studio-screens"
import { motionAddressOf } from "@/studio/recast/old-address"

export function AppScreen({ seeds }: StudioScreenProps): ReactElement {
  return <Navigate {...motionAddressOf(seeds)} replace={true} />
}
