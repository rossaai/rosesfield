import type { GalleryKey } from "@/gallery/copy.en"
import type { GalleryEntry } from "@/gallery/gallery-entry"
import { conversationEntries } from "@/gallery/screens/conversation-entries"
import { exploreEntries } from "@/gallery/screens/explore-entries"
import {
  failedWith,
  missingId,
  type Seed,
  screenAssets,
  screenCharacter,
  screenRuns,
  seeds,
} from "@/gallery/screens/screen-fixtures"
import { screenEntry } from "@/gallery/screens/screen-frame"
import { settingsEntries } from "@/gallery/screens/settings-entries"

const { image, video, upscale, working, failed } = screenRuns
const { first, second, clip, upload, larger } = screenAssets
const base: readonly Seed[] = [seeds.settings(), seeds.media()]
const allAssets = [first, second, clip, upload, larger]

const apps = screenEntry("apps", "entry.screen.apps", [
  {
    id: "empty",
    label: "state.noMatch",
    path: "/apps?q=nothing-matches-this",
    seeds: [...base, seeds.runs([])],
  },
  { id: "loading", label: "state.loading", path: "/apps", seeds: base },
  {
    id: "working",
    label: "state.working",
    path: "/apps",
    seeds: [...base, seeds.runs([working, image])],
  },
  {
    id: "done",
    label: "state.done",
    path: "/apps",
    seeds: [...base, seeds.runs([image, video, upscale])],
  },
  {
    id: "failed",
    label: "state.failed",
    path: "/apps",
    seeds: [...base, seeds.failed(["runs", { appId: null }])],
  },
])

const failures: ReadonlyArray<{
  id: string
  label: GalleryKey
  code: string
  status: number
}> = [
  {
    id: "failed-key",
    label: "state.failedKey",
    code: "ENGINE_KEY_INVALID",
    status: 401,
  },
  {
    id: "failed-rate",
    label: "state.failedRateLimited",
    code: "ENGINE_RATE_LIMITED",
    status: 429,
  },
  {
    id: "failed-time",
    label: "state.failedTimedOut",
    code: "RUN_TIMED_OUT",
    status: 504,
  },
]

function appEntry(appId: string, title: GalleryKey, done: typeof image) {
  const path = `/apps/${appId}`
  const runsOf = (runs: readonly (typeof image)[]): readonly Seed[] => [
    ...base,
    seeds.runs(runs),
    seeds.runs(runs, appId),
  ]
  const failedStates = failures.map((failure) => ({
    id: failure.id,
    label: failure.label,
    path,
    seeds: runsOf([
      { ...failedWith(failure.code, failure.status), appId: done.appId },
    ]),
  }))
  return screenEntry(appId, title, [
    { id: "empty", label: "state.empty", path, seeds: runsOf([]) },
    { id: "loading", label: "state.loading", path, seeds: base },
    {
      id: "working",
      label: "state.working",
      path,
      seeds: runsOf([{ ...working, appId: done.appId }]),
    },
    { id: "done", label: "state.done", path, seeds: runsOf([done]) },
    {
      id: "failed",
      label: "state.failed",
      path,
      seeds: runsOf([{ ...failed, appId: done.appId }]),
    },
    ...failedStates,
  ])
}

const library = screenEntry("library", "entry.screen.library", [
  {
    id: "empty",
    label: "state.empty",
    path: "/library",
    seeds: [...base, seeds.assets([]), seeds.runs([])],
  },
  { id: "loading", label: "state.loading", path: "/library", seeds: base },
  {
    id: "working",
    label: "state.working",
    path: "/library",
    seeds: [...base, seeds.assets([first, second]), seeds.runs([working])],
  },
  {
    id: "done",
    label: "state.done",
    path: "/library",
    seeds: [...base, seeds.assets(allAssets), seeds.runs([])],
  },
  {
    id: "failed",
    label: "state.failed",
    path: "/library",
    seeds: [...base, seeds.failed(["assets", { kind: null }]), seeds.runs([])],
  },
])

const libraryDone = [...base, seeds.assets(allAssets), seeds.runs([])]

const viewer = screenEntry("viewer", "entry.screen.viewer", [
  {
    id: "empty",
    label: "state.empty",
    path: `/library?view=${missingId}`,
    seeds: [...libraryDone, seeds.missing(["asset", missingId])],
  },
  {
    id: "loading",
    label: "state.loading",
    path: `/library?view=${missingId}`,
    seeds: libraryDone,
  },
  {
    id: "done",
    label: "state.done",
    path: `/library?view=${first.id}`,
    seeds: libraryDone,
  },
  {
    id: "compare",
    label: "state.compare",
    path: `/library?view=${larger.id}`,
    seeds: libraryDone,
  },
  {
    id: "upload",
    label: "state.upload",
    path: `/library?view=${upload.id}`,
    seeds: libraryDone,
  },
])

const characters = screenEntry("characters", "entry.screen.characters", [
  {
    id: "empty",
    label: "state.empty",
    path: "/characters",
    seeds: [...base, seeds.characters([])],
  },
  { id: "loading", label: "state.loading", path: "/characters", seeds: base },
  {
    id: "done",
    label: "state.done",
    path: "/characters",
    seeds: [...base, seeds.characters([screenCharacter])],
  },
  {
    id: "failed",
    label: "state.failed",
    path: "/characters",
    seeds: [...base, seeds.failed(["characters"])],
  },
])

const characterPath = `/characters/${screenCharacter.id}`

const character = screenEntry("character", "entry.screen.character", [
  {
    id: "empty",
    label: "state.empty",
    path: characterPath,
    seeds: [...base, seeds.missing(["character", screenCharacter.id])],
  },
  { id: "loading", label: "state.loading", path: characterPath, seeds: base },
  {
    id: "done",
    label: "state.done",
    path: characterPath,
    seeds: [
      ...base,
      seeds.characters([screenCharacter]),
      seeds.runs([image]),
      seeds.runs([], "characters"),
    ],
  },
  {
    id: "failed",
    label: "state.failed",
    path: characterPath,
    seeds: [...base, seeds.failed(["character", screenCharacter.id])],
  },
])

const newCharacter = screenEntry("new-character", "entry.screen.newCharacter", [
  {
    id: "empty",
    label: "state.empty",
    path: "/characters/new",
    seeds: [...base, seeds.characters([])],
  },
  {
    id: "traits",
    label: "state.fromTraits",
    path: "/characters/new?mode=traits",
    seeds: [...base, seeds.characters([]), seeds.runs([], "characters")],
  },
])

const history = screenEntry("history", "entry.screen.history", [
  {
    id: "empty",
    label: "state.empty",
    path: "/history",
    seeds: [...base, seeds.runs([])],
  },
  { id: "loading", label: "state.loading", path: "/history", seeds: base },
  {
    id: "working",
    label: "state.working",
    path: "/history",
    seeds: [...base, seeds.runs([working, image])],
  },
  {
    id: "done",
    label: "state.done",
    path: "/history",
    seeds: [...base, seeds.runs([image, video, upscale])],
  },
  {
    id: "failed",
    label: "state.failed",
    path: "/history",
    seeds: [...base, seeds.failed(["runs", { appId: null }])],
  },
])

const runScreen = screenEntry("run", "entry.screen.run", [
  {
    id: "empty",
    label: "state.empty",
    path: `/history/${missingId}`,
    seeds: [...base, seeds.runs([]), seeds.missing(["run", missingId])],
  },
  {
    id: "loading",
    label: "state.loading",
    path: `/history/${missingId}`,
    seeds: [...base, seeds.runs([])],
  },
  {
    id: "working",
    label: "state.working",
    path: `/history/${working.id}`,
    seeds: [...base, seeds.runs([working])],
  },
  {
    id: "done",
    label: "state.done",
    path: `/history/${image.id}`,
    seeds: [...base, seeds.runs([image])],
  },
  {
    id: "failed",
    label: "state.failed",
    path: `/history/${failed.id}`,
    seeds: [...base, seeds.runs([failed])],
  },
])

const outside = [
  screenEntry("unlock", "entry.screen.unlock", [
    { id: "empty", label: "state.empty", path: "/unlock", seeds: [] },
  ]),
  screenEntry("welcome", "entry.screen.welcome", [
    { id: "done", label: "state.done", path: "/welcome", seeds: [] },
  ]),
  screenEntry("not-found", "entry.screen.notFound", [
    { id: "empty", label: "state.empty", path: "/no-such-page", seeds: base },
  ]),
]

export const screenEntries: GalleryEntry[] = [
  ...exploreEntries,
  apps,
  appEntry("image", "entry.screen.appBar", image),
  appEntry("upscale", "entry.screen.appColumn", upscale),
  appEntry("video", "entry.screen.video", video),
  library,
  viewer,
  characters,
  character,
  newCharacter,
  history,
  runScreen,
  ...conversationEntries,
  ...settingsEntries,
  ...outside,
]
