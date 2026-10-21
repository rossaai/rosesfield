import { Navigate } from "@tanstack/react-router"
import type { ReactElement } from "react"
import { voiceMove } from "@/studio/audio/audio-address"

export function AppScreen(): ReactElement {
  return (
    <Navigate
      to="/apps/$appId"
      params={{ appId: voiceMove.appId }}
      hash={voiceMove.hash}
      replace
    />
  )
}
