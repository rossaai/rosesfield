export type CameraMove =
  | "auto"
  | "static"
  | "push-in"
  | "pull-out"
  | "track-left"
  | "track-right"
  | "crane-up"
  | "crane-down"

export type MovingCameraMove = Exclude<CameraMove, "auto">

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

export const cameraSentences: Readonly<Record<MovingCameraMove, string>> = {
  static: "The camera holds still for the whole shot.",
  "push-in": "The camera moves slowly forward, toward the subject.",
  "pull-out": "The camera moves slowly backward, away from the subject.",
  "track-left": "The camera travels sideways to the left.",
  "track-right": "The camera travels sideways to the right.",
  "crane-up": "The camera rises slowly straight up.",
  "crane-down": "The camera lowers slowly straight down.",
}

export const funCameraPoses: Readonly<Record<MovingCameraMove, string>> = {
  static: "Static",
  "push-in": "Zoom In",
  "pull-out": "Zoom Out",
  "track-left": "Pan Left",
  "track-right": "Pan Right",
  "crane-up": "Pan Up",
  "crane-down": "Pan Down",
}
