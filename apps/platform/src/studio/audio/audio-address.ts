import { voiceCloneTab } from "@/studio/audio/audio-tabs"

export type MovedApp = { appId: string; hash: string }

export const voiceAppId = "voice"

export const voiceMove: MovedApp = { appId: "audio", hash: voiceCloneTab }

export function movedAppOf(appId: string): MovedApp | null {
  return appId === voiceAppId ? voiceMove : null
}
