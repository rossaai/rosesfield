import { videoCopy } from "#video/copy.en"

export type CameraMove =
  | "auto"
  | "static"
  | "push-in"
  | "pull-out"
  | "track-left"
  | "track-right"
  | "crane-up"
  | "crane-down"

type CameraMoveRow = {
  value: CameraMove
  labelKey: string
}

export const cameraMoves: readonly CameraMoveRow[] = [
  { value: "auto", labelKey: "choice.auto" },
  { value: "static", labelKey: "video.choice.cameraMove.static" },
  { value: "push-in", labelKey: "video.choice.cameraMove.pushIn" },
  { value: "pull-out", labelKey: "video.choice.cameraMove.pullOut" },
  { value: "track-left", labelKey: "video.choice.cameraMove.trackLeft" },
  { value: "track-right", labelKey: "video.choice.cameraMove.trackRight" },
  { value: "crane-up", labelKey: "video.choice.cameraMove.craneUp" },
  { value: "crane-down", labelKey: "video.choice.cameraMove.craneDown" },
]

export const cameraWordsSeparator = "\n"

export function cameraWordsKeyOf(move: string): string {
  return `video.cameraMove.${move}.words`
}

export function cameraWordsOf(move: string): string {
  const row = cameraMoves.find((one) => one.value === move)
  return row === undefined || row.value === "auto"
    ? ""
    : (videoCopy[cameraWordsKeyOf(row.value)] ?? "")
}

export function withCameraWords(prompt: string, move: string | null): string {
  const words = move === null ? "" : cameraWordsOf(move)
  return words === "" ? prompt : `${prompt}${cameraWordsSeparator}${words}`
}
