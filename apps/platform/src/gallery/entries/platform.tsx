import type { Run } from "@rosesfield/contract"
import { useQueryClient } from "@tanstack/react-query"
import { type ReactElement, type ReactNode, useState } from "react"
import { t } from "@/gallery/copy.en"
import {
  galleryApp,
  galleryAssets,
  galleryRun,
  silentWav,
} from "@/gallery/fixtures/platform-fixtures"
import { GalleryData } from "@/gallery/gallery-data"
import type { GalleryEntry, GalleryState } from "@/gallery/gallery-entry"
import { AudioRow } from "@/pieces/audio-row"
import { DropWell } from "@/pieces/drop-well"
import { RunCard } from "@/pieces/run/run-card"
import { UploadRow } from "@/pieces/upload-row"
import type { Upload } from "@/pieces/use-uploads"
import {
  defaultsOf,
  type FieldProblem,
  type FieldValue,
} from "@/screens/app/app-form"
import { InputField } from "@/screens/app/fields/input-field"
import { priceQuery } from "@/screens/app/hosted/model-catalog-query"

function RunBlock({
  run,
  estimate = null,
}: {
  run: Run
  estimate?: number | null
}): ReactElement {
  return (
    <GalleryData>
      <PriceSeed run={run} estimate={estimate}>
        <RunCard run={run} onUseInputs={() => undefined} />
      </PriceSeed>
    </GalleryData>
  )
}

function PriceSeed({
  run,
  estimate,
  children,
}: {
  run: Run
  estimate: number | null
  children: ReactNode
}): ReactNode {
  const client = useQueryClient()
  useState(() => {
    if (estimate !== null) {
      const ask = {
        inputs: run.inputs,
        count: run.count,
        aspectRatio: run.aspectRatio,
      }
      client.setQueryData(priceQuery(run.appId, ask, "missing").queryKey, {
        price: { source: "rates", credits: estimate },
      })
    }
    return null
  })
  return children
}

const liveRun: Partial<Run> = {
  origin: "live",
  engine: {
    adapter: "comfy-router",
    models: ["luma/photon-flash-1"],
    workflowHash: null,
  },
}

const runStates: GalleryState[] = [
  {
    id: "working",
    label: "state.working",
    render: () => (
      <RunBlock
        run={galleryRun({
          status: "running",
          outputs: [],
          progress: 0.4,
          createdAt: new Date().toISOString(),
          finishedAt: null,
        })}
      />
    ),
  },
  {
    id: "waiting",
    label: "state.waitingLong",
    render: () => (
      <RunBlock
        run={galleryRun({
          status: "queued",
          outputs: [],
          createdAt: new Date(Date.now() - 15_000).toISOString(),
          finishedAt: null,
        })}
      />
    ),
  },
  {
    id: "done",
    label: "state.done",
    render: () => <RunBlock run={galleryRun({})} />,
  },
  {
    id: "real-credits",
    label: "state.realCredits",
    render: () => (
      <RunBlock
        run={galleryRun({
          ...liveRun,
          cost: { amount: 1.188768 / 211, currency: "USD" },
        })}
      />
    ),
  },
  {
    id: "estimated-credits",
    label: "state.estimatedCredits",
    render: () => <RunBlock run={galleryRun(liveRun)} estimate={0.57} />,
  },
  {
    id: "failed",
    label: "state.failed",
    render: () => (
      <RunBlock
        run={galleryRun({
          status: "failed",
          outputs: [],
          failure: { code: "ENGINE_UNAVAILABLE", status: 502 },
        })}
      />
    ),
  },
  {
    id: "stopped",
    label: "state.stopped",
    render: () => (
      <RunBlock run={galleryRun({ status: "cancelled", outputs: [] })} />
    ),
  },
]

function Fields({ problem }: { problem: FieldProblem | undefined }): ReactNode {
  const [values, setValues] = useState<Readonly<Record<string, FieldValue>>>(
    () => defaultsOf(galleryApp).inputs
  )
  return (
    <GalleryData>
      <div className="flex flex-col gap-s4">
        {galleryApp.inputs.map((input) => (
          <InputField
            key={input.name}
            app={galleryApp}
            input={input}
            value={values[input.name]}
            problem={input.name === problem?.name ? problem : undefined}
            onChange={(value) =>
              setValues((current) => ({ ...current, [input.name]: value }))
            }
            register={() => undefined}
          />
        ))}
      </div>
    </GalleryData>
  )
}

function Well({ ids }: { ids: string[] }): ReactElement {
  const [current, setCurrent] = useState(ids)
  return (
    <GalleryData>
      <DropWell
        kind="image"
        ids={current}
        max={4}
        onChange={setCurrent}
        onMessage={() => undefined}
      />
    </GalleryData>
  )
}

function uploadOf(status: Upload["status"]): Upload {
  return {
    key: status,
    file: new File([new Uint8Array(4)], "portrait.png", { type: "image/png" }),
    progress: 0.6,
    status,
    asset: null,
  }
}

function Row({ status }: { status: Upload["status"] }): ReactElement {
  return (
    <UploadRow
      upload={uploadOf(status)}
      onStop={() => undefined}
      onRetry={() => undefined}
      onRemove={() => undefined}
    />
  )
}

const fieldStates: GalleryState[] = [
  {
    id: "empty",
    label: "state.empty",
    render: () => <Fields problem={undefined} />,
  },
  {
    id: "invalid",
    label: "state.invalid",
    render: () => (
      <Fields
        problem={{ name: "prompt", key: "field.prompt.required", values: {} }}
      />
    ),
  },
]

const wellStates: GalleryState[] = [
  { id: "empty", label: "state.empty", render: () => <Well ids={[]} /> },
  {
    id: "filled",
    label: "state.filled",
    render: () => (
      <Well ids={[galleryAssets.wide.id, galleryAssets.square.id]} />
    ),
  },
]

export const platformEntries: GalleryEntry[] = [
  { id: "run-outputs", title: "entry.runOutputs", states: runStates },
  { id: "input-fields", title: "entry.inputFields", states: fieldStates },
  { id: "drop-well", title: "entry.dropWell", states: wellStates },
  {
    id: "audio-row",
    title: "entry.audioRow",
    states: [
      {
        id: "default",
        label: "state.value",
        render: () => (
          <AudioRow
            src={silentWav}
            name={t("sample.script")}
            durationSeconds={2}
            caption={t("sample.demoCaption")}
            onDownload={() => undefined}
          />
        ),
      },
    ],
  },
  {
    id: "upload-row",
    title: "entry.uploadRow",
    states: [
      {
        id: "uploading",
        label: "state.uploading",
        render: () => <Row status="uploading" />,
      },
      {
        id: "failed",
        label: "state.failed",
        render: () => <Row status="failed" />,
      },
      {
        id: "unsupported",
        label: "state.unsupported",
        render: () => <Row status="unsupported" />,
      },
    ],
  },
]
