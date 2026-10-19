import { holdVisitorKey } from "@/api/visitor-keys"
import type { GalleryEntry } from "@/gallery/gallery-entry"
import {
  liveSettings,
  publicSettingsOf,
  seeds,
} from "@/gallery/screens/screen-fixtures"
import { screenEntry } from "@/gallery/screens/screen-frame"

const sampleKey = "gallery-sample-key"

const settings = screenEntry("settings", "entry.screen.settings", [
  { id: "loading", label: "state.loading", path: "/settings", seeds: [] },
  {
    id: "done",
    label: "state.done",
    path: "/settings",
    seeds: [seeds.settings()],
  },
  {
    id: "live",
    label: "state.liveKey",
    path: "/settings",
    seeds: [seeds.settingsAs(liveSettings)],
  },
  {
    id: "failed",
    label: "state.failed",
    path: "/settings",
    seeds: [seeds.failed(["settings"])],
  },
])

const publicSettings = screenEntry(
  "settings-public",
  "entry.screen.settingsPublic",
  [
    {
      id: "empty",
      label: "state.noKey",
      path: "/settings",
      seeds: [seeds.settingsAs(publicSettingsOf(false))],
      before: () => {
        holdVisitorKey("engine", null)
        holdVisitorKey("agent", null)
      },
    },
    { id: "loading", label: "state.loading", path: "/settings", seeds: [] },
    {
      id: "done",
      label: "state.keyKept",
      path: "/settings",
      seeds: [seeds.settingsAs(publicSettingsOf(true))],
      before: () => {
        holdVisitorKey("engine", sampleKey)
        holdVisitorKey("agent", sampleKey)
      },
    },
    {
      id: "failed",
      label: "state.failed",
      path: "/settings",
      seeds: [seeds.failed(["settings"])],
    },
  ]
)

const connect = screenEntry("connect", "entry.screen.connect", [
  { id: "loading", label: "state.loading", path: "/connect", seeds: [] },
  {
    id: "done",
    label: "state.done",
    path: "/connect",
    seeds: [seeds.settings()],
  },
  {
    id: "api",
    label: "state.apiTab",
    path: "/connect?client=api",
    seeds: [seeds.settingsAs(liveSettings)],
  },
  {
    id: "public",
    label: "state.publicMode",
    path: "/connect?client=other",
    seeds: [seeds.settingsAs(publicSettingsOf(true))],
  },
  {
    id: "failed",
    label: "state.failed",
    path: "/connect",
    seeds: [seeds.failed(["settings"])],
  },
])

export const settingsEntries: GalleryEntry[] = [
  connect,
  settings,
  publicSettings,
]
