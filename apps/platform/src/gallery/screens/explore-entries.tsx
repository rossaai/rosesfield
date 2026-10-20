import { type Run, run } from "@rosesfield/contract"
import { Card } from "@rosesfield/ui/components/card"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { type ReactElement, type ReactNode, useState } from "react"
import { holdVisitorKey } from "@/api/visitor-keys"
import demoTall from "@/gallery/fixtures/demo-image-9-16.png"
import demoVideo from "@/gallery/fixtures/demo-video-16-9.mp4"
import type { GalleryEntry, GalleryState } from "@/gallery/gallery-entry"
import {
  liveSettings,
  publicSettingsOf,
  screenRuns,
  seeds,
} from "@/gallery/screens/screen-fixtures"
import { type StateSpec, screenEntry } from "@/gallery/screens/screen-frame"
import {
  type ExploreAdmission,
  exploreListQuery,
} from "@/screens/explore/explore-list"
import type { SharedOutput } from "@/screens/explore/share-api"
import {
  ClipHeading,
  ClipIdle,
  ClipPreview,
  LinkRow,
  ShareFailed,
  ShareMaking,
} from "@/screens/explore/share-views"
import type { Account } from "@/screens/settings/account-query"
import { accountQuery } from "@/screens/settings/account-query"
import {
  KeyAccepted,
  KeyFormView,
  type Refusal,
} from "@/screens/settings/key-dialog"

const shareId = "gallery-share"
const link = "https://rosesfield.com/share/gallery-share"

const cost = { amount: 0.0061, currency: "USD" as const }

const liveImage: Run = {
  ...screenRuns.image,
  origin: "live",
  cost,
  engine: {
    adapter: "comfy-workflow",
    models: ["flux-2-klein-4b.safetensors"],
    workflowHash: "53e153be",
  },
  inputs: { ...screenRuns.image.inputs, model: "flux-2-klein-4b" },
}

const liveVideo: Run = {
  ...screenRuns.video,
  origin: "live",
  cost: { amount: 0.021, currency: "USD" },
}

const sharedView: SharedOutput = {
  id: shareId,
  path: `/share/${shareId}`,
  run: run.parse({
    ...liveImage,
    appId: "background-removal",
    inputs: { image: [], background: "transparent", model: "birefnet" },
    outputs: [],
  }),
  media: [
    {
      index: 0,
      kind: "image",
      mime: "image/png",
      width: 900,
      height: 1600,
      durationSeconds: null,
    },
  ],
  sources: [demoTall],
  createdAt: "2026-10-19T12:00:00.000Z",
  expiresAt: "2027-01-17T12:00:00.000Z",
}

function accountOf(change: Partial<Account>): Account {
  return {
    key: "missing",
    credits: null,
    retentionDays: 30,
    cap: null,
    ...change,
  }
}

const noKey = (): void => holdVisitorKey("engine", null)
const withKey = (): void => holdVisitorKey("engine", "gallery-sample-key")

const publicNoKey = [
  seeds.settingsAs(publicSettingsOf(false)),
  seeds.data(accountQuery.queryKey, accountOf({})),
]

const publicKey = [
  seeds.settingsAs(publicSettingsOf(true)),
  seeds.data(
    accountQuery.queryKey,
    accountOf({ key: "valid", credits: 4124.48 })
  ),
]

function admissionOf(target: Run): ExploreAdmission {
  return {
    runId: target.id,
    source: "own-open-weights",
    yes: "2026-10-19",
    people: "none",
    brand: false,
  }
}

const exploreList = seeds.data(exploreListQuery.queryKey, [
  admissionOf(liveImage),
  admissionOf(liveVideo),
])

const doneSeeds = [
  ...publicKey,
  exploreList,
  seeds.media(),
  seeds.data(["shares", "published"], [sharedView]),
  seeds.runs([liveImage, liveVideo]),
]

export const exploreStates: StateSpec[] = [
  {
    id: "empty",
    label: "state.noKey",
    path: "/",
    seeds: [
      ...publicNoKey,
      seeds.data(["shares", "published"], []),
      seeds.runs([]),
    ],
    before: noKey,
  },
  {
    id: "loading",
    label: "state.loading",
    path: "/",
    seeds: publicNoKey,
    before: noKey,
  },
  {
    id: "done",
    label: "state.done",
    path: "/",
    seeds: doneSeeds,
    before: withKey,
  },
  {
    id: "failed",
    label: "state.failed",
    path: "/",
    seeds: [
      ...publicKey,
      seeds.failed(["shares", "published"]),
      seeds.failed(["runs", { appId: null }]),
    ],
    before: withKey,
  },
  {
    id: "rail",
    label: "state.rail",
    path: "/",
    seeds: doneSeeds,
    before: () => {
      withKey()
      window.localStorage.setItem("rosesfield.sidebar", "rail")
    },
  },
  {
    id: "cap",
    label: "state.cap",
    path: "/",
    seeds: [
      seeds.settingsAs(liveSettings),
      seeds.data(
        accountQuery.queryKey,
        accountOf({
          key: "valid",
          credits: 4124.48,
          cap: { credits: 800, left: 637.5 },
        })
      ),
      seeds.media(),
      exploreList,
      seeds.data(["shares", "published"], []),
      seeds.runs([liveImage]),
    ],
    before: () => window.localStorage.removeItem("rosesfield.sidebar"),
  },
]

const sharePath = `/share/${shareId}`

const shareStates: StateSpec[] = [
  { id: "loading", label: "state.loading", path: sharePath, seeds: [] },
  {
    id: "done",
    label: "state.done",
    path: sharePath,
    seeds: [seeds.data(["share", shareId], sharedView)],
  },
  {
    id: "gone",
    label: "state.gone",
    path: sharePath,
    seeds: [seeds.missing(["share", shareId])],
  },
  {
    id: "failed",
    label: "state.failed",
    path: sharePath,
    seeds: [seeds.failed(["share", shareId])],
  },
]

function LayerFrame({
  account,
  children,
}: {
  account: Account
  children: ReactNode
}): ReactElement {
  const [client] = useState(() => {
    const made = new QueryClient({
      defaultOptions: { queries: { enabled: false, staleTime: Infinity } },
    })
    made.setQueryData(accountQuery.queryKey, account)
    return made
  })
  return (
    <QueryClientProvider client={client}>
      <Card className="max-w-dialog">{children}</Card>
    </QueryClientProvider>
  )
}

function keyState(
  id: string,
  label: GalleryState["label"],
  body: () => ReactNode
): GalleryState {
  return {
    id,
    label,
    render: () => <LayerFrame account={accountOf({})}>{body()}</LayerFrame>,
  }
}

function form(refusal: Refusal | null, busy = false): ReactNode {
  return (
    <KeyFormView
      value={refusal === null && !busy ? "" : "comfyui-sample"}
      onChange={() => undefined}
      problem={null}
      refusal={refusal}
      busy={busy}
      onSubmit={() => undefined}
    />
  )
}

const keyEntry: GalleryEntry = {
  id: "layer-key",
  title: "entry.layer.key",
  states: [
    keyState("empty", "state.empty", () => form(null)),
    keyState("busy", "state.busy", () => form(null, true)),
    keyState("done", "state.done", () => (
      <KeyAccepted credits={4124.48} onDone={() => undefined} />
    )),
    keyState("wrong", "state.failedKey", () => form("wrong")),
    keyState("no-plan", "state.noPlan", () => form("no-plan")),
    keyState("workspace", "state.keyOutsideWorkspace", () =>
      form("outside-workspace")
    ),
    keyState("comfy-busy", "state.comfyBusy", () => form("busy")),
    keyState("unreachable", "state.unreachable", () => form("unreachable")),
  ],
}

function shareState(
  id: string,
  label: GalleryState["label"],
  body: () => ReactNode
): GalleryState {
  return {
    id,
    label,
    render: () => (
      <LayerFrame account={accountOf({})}>
        <div className="flex flex-col gap-s6">{body()}</div>
      </LayerFrame>
    ),
  }
}

const shareEntry: GalleryEntry = {
  id: "layer-share",
  title: "entry.layer.share",
  states: [
    shareState("loading", "state.loading", () => <ShareMaking />),
    shareState("failed", "state.failed", () => (
      <ShareFailed onRetry={() => undefined} />
    )),
    shareState("done", "state.done", () => (
      <>
        <LinkRow url={link} />
        <section className="flex flex-col gap-s2">
          <ClipHeading />
          <ClipIdle busy={false} failed={false} onMake={() => undefined} />
        </section>
      </>
    )),
    shareState("working", "state.working", () => (
      <>
        <LinkRow url={link} />
        <section className="flex flex-col gap-s2">
          <ClipHeading />
          <ClipIdle busy={true} failed={false} onMake={() => undefined} />
        </section>
      </>
    )),
    shareState("clip", "state.clip", () => (
      <>
        <LinkRow url={link} />
        <section className="flex flex-col gap-s2">
          <ClipHeading />
          <ClipPreview src={demoVideo} url={link} onSave={() => undefined} />
        </section>
      </>
    )),
  ],
}

export const exploreEntries: GalleryEntry[] = [
  screenEntry("explore", "entry.screen.explore", exploreStates),
  screenEntry("share-page", "entry.screen.share", shareStates),
  keyEntry,
  shareEntry,
]
