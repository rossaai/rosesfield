import { Tabs, TabsList, TabsTrigger } from "@rosesfield/ui/components/tabs"
import { type ReactElement, useEffect, useRef, useState } from "react"
import { tCatalog } from "@/copy/t"
import { CollapsibleSection } from "@/pieces/collapsible-section"
import { DropWell } from "@/pieces/drop-well"
import { FieldFrame } from "@/screens/app/fields/field-frame"
import { listOf } from "@/screens/app/fields/field-props"
import { CatalogPicker } from "@/screens/app/hosted/catalog-picker"
import { HostedFields } from "@/screens/app/hosted/hosted-fields"
import { AdvancedFields } from "@/screens/app/inputs-panel"
import {
  type LipsyncTab,
  lipsyncTabs,
  tabKeys,
  tabsLabelKey,
} from "@/studio/lipsync/lipsync-tabs"
import { WordsField } from "@/studio/lipsync/lipsync-words-field"
import type { LipsyncScreen } from "@/studio/lipsync/use-lipsync-screen"

type FaceKeys = { label: string; note: string }

const faceKeys: Readonly<Record<LipsyncTab, FaceKeys>> = {
  photo: {
    label: "lipsync.input.photo.label",
    note: "lipsync.input.photo.note",
  },
  clip: {
    label: "lipsync.input.clip.label",
    note: "lipsync.input.clip.note",
  },
}

function isLipsyncTab(value: unknown): value is LipsyncTab {
  return lipsyncTabs.some((tab) => tab === value)
}

export function LipsyncModeTabs({
  screen,
}: {
  screen: Pick<LipsyncScreen, "tab" | "setTab">
}): ReactElement {
  return (
    <Tabs
      value={screen.tab}
      onValueChange={(next) => {
        if (isLipsyncTab(next)) {
          screen.setTab(next)
        }
      }}
    >
      <TabsList aria-label={tCatalog(tabsLabelKey)}>
        {lipsyncTabs.map((one) => (
          <TabsTrigger key={one} value={one}>
            {tCatalog(tabKeys[one])}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}

function FaceWell({ screen }: { screen: LipsyncScreen }): ReactElement | null {
  const { face, form, tab } = screen
  const trigger = useRef<HTMLButtonElement>(null)
  const [message, setMessage] = useState<string | null>(null)
  const name = face?.kind === "media" ? face.name : null
  useEffect(() => {
    if (name !== null) {
      const focus = (): void => trigger.current?.focus()
      form.register(name, focus)
      screen.registerWell(name, focus)
    }
  })
  if (face?.kind !== "media" || name === null) {
    return null
  }
  const keys = faceKeys[tab]
  return (
    <FieldFrame
      caption={tCatalog(keys.label)}
      isOptional={!face.required}
      note={null}
      problem={screen.wellProblems[name] ?? form.problems.get(name)}
      message={message}
    >
      <DropWell
        kind={face.media}
        ids={listOf(form.values.inputs[name])}
        max={1}
        onChange={(next) => form.setInput(name, next)}
        onMessage={setMessage}
        triggerRef={trigger}
        limits={tab === "photo" ? tCatalog(keys.note) : undefined}
      />
    </FieldFrame>
  )
}

function Settings({ screen }: { screen: LipsyncScreen }): ReactElement | null {
  const { fields, form, plan } = screen
  if (fields === null) {
    return null
  }
  const length =
    plan.mode === "text" && fields.length !== null ? [fields.length] : []
  const shown = [...length, ...fields.rest]
  return (
    <>
      {shown.length === 0 ? null : (
        <CollapsibleSection title={tCatalog("video.settings.more")}>
          <HostedFields fields={shown} form={form} />
        </CollapsibleSection>
      )}
      {screen.isGraph ? (
        <AdvancedFields
          app={screen.bodyApp}
          form={form}
          lastSeed={screen.lastSeed}
        />
      ) : null}
    </>
  )
}

export function LipsyncPanel({
  screen,
}: {
  screen: LipsyncScreen
}): ReactElement {
  return (
    <div data-slot="lipsync-parts" className="flex flex-1 flex-col gap-s4">
      <FaceWell screen={screen} />
      <WordsField screen={screen} />
      <CatalogPicker hosted={screen.hosted} place="row" />
      <Settings screen={screen} />
    </div>
  )
}
