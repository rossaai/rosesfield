export type MovedApp = { appId: string; hash: string }

export const voiceAppId = "voice"

const modeApps: Readonly<Record<string, string>> = {
  speech: "speech",
  clone: "voice-clone",
  change: "voice-change",
  music: "music",
  sound: "sound-effects",
}

export const voiceMove: MovedApp = { appId: "voice-clone", hash: "" }

export function audioAppOfMode(mode: string): string {
  return modeApps[mode] ?? "speech"
}

export function movedAppOf(appId: string, hash = ""): MovedApp | null {
  if (appId === voiceAppId) {
    return voiceMove
  }
  return appId === "audio"
    ? { appId: audioAppOfMode(hash.replace(/^#/, "")), hash: "" }
    : null
}
