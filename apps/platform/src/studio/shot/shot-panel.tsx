import type { ModelField } from "@rosesfield/catalog/comfy"
import type { AppListing } from "@rosesfield/contract"
import { PromptBlock } from "@rosesfield/ui/components/input-panel"
import type { ReactElement, ReactNode } from "react"
import { t, tCatalog } from "@/copy/t"
import { CollapsibleSection } from "@/pieces/collapsible-section"
import { appliedApp } from "@/screens/app/app-form"
import { ChoiceField } from "@/screens/app/fields/choice-field"
import { CountField } from "@/screens/app/fields/output-fields"
import {
  AdvancedSection,
  AppSettingRows,
} from "@/screens/app/fields/setting-rows"
import { CatalogPicker } from "@/screens/app/hosted/catalog-picker"
import { HostedField } from "@/screens/app/hosted/hosted-fields"
import { appSettingsPlan, fieldSettingsPlan } from "@/screens/app/settings-plan"
import type { AppForm } from "@/screens/app/use-app-form"
import { choiceKeyOf, choiceValuesOf } from "@/studio/shot/shot-prompt"
import type { ShotScreen } from "@/studio/shot/use-shot-screen"
import { settingFieldsOf, soundInput } from "@/studio/video/video-chips"
import { VideoWells } from "@/studio/video/video-wells"
import { shotListOrder } from "../../../../../packages/catalog/src/shot/shot-words"

const movementList = "movement"

const lookLists = shotListOrder.filter((list) => list !== movementList)

const lookLabelKey = "storyboard.input.look.label"

type PanelProps = {
  app: AppListing
  screen: ShotScreen
}

export function SentWords({ words }: { words: string }): ReactNode {
  if (words === "") {
    return null
  }
  const label = tCatalog("shot.sentWords.label")
  return (
    <section
      aria-label={label}
      data-slot="shot-words"
      className="flex flex-col gap-1 px-1"
    >
      <p className="text-label text-ink-muted">{label}</p>
      <p
        aria-live="polite"
        className="whitespace-pre-wrap text-caption text-ink"
      >
        {words}
      </p>
    </section>
  )
}

function ScenePart({ screen }: { screen: ShotScreen }): ReactElement {
  const { state, promptName, shot } = screen
  const problem = state.form.problems.get(promptName)
  const label = tCatalog("shot.input.prompt.label")
  return (
    <div className="flex flex-col gap-1">
      <PromptBlock label={label}>
        <textarea
          aria-label={label}
          aria-invalid={problem === undefined ? undefined : true}
          placeholder={tCatalog("shot.input.prompt.placeholder")}
          value={shot.scene}
          onChange={(event) => screen.setScene(event.target.value)}
          className="min-h-0 w-full flex-1 resize-none bg-transparent text-body text-ink outline-none placeholder:text-ink-muted"
        />
      </PromptBlock>
      {problem === undefined ? null : (
        <p role="alert" className="px-1 text-label text-bug-text">
          {t(problem.key, problem.values)}
        </p>
      )}
      <SentWords words={screen.words} />
    </div>
  )
}

function ShotChoice({
  screen,
  list,
}: {
  screen: ShotScreen
  list: (typeof shotListOrder)[number]
}): ReactElement {
  return (
    <ChoiceField
      label={tCatalog(`shot.input.${list}.label`)}
      items={choiceValuesOf(list).map((value) => ({
        value,
        label: tCatalog(choiceKeyOf(list, value)),
      }))}
      value={screen.shot.choices[list]}
      onChange={(value) => screen.setChoice(list, value)}
      note={null}
    />
  )
}

function LookSection({ screen }: { screen: ShotScreen }): ReactElement {
  return (
    <CollapsibleSection title={tCatalog(lookLabelKey)}>
      <div data-slot="shot-choices" className="grid grid-cols-2 gap-2">
        {lookLists.map((list) => (
          <ShotChoice key={list} screen={screen} list={list} />
        ))}
      </div>
    </CollapsibleSection>
  )
}

function FieldRows({
  fields,
  form,
}: {
  fields: readonly ModelField[]
  form: AppForm
}): ReactNode {
  return fields.map((field) => (
    <HostedField
      key={field.name}
      field={field}
      value={form.values.inputs[field.name]}
      form={form}
    />
  ))
}

function ShotSettings({ app, screen }: PanelProps): ReactNode {
  const { state, fields } = screen
  const { form, lastSeed } = state
  const look = <LookSection screen={screen} />
  if (fields === null) {
    const plan = appSettingsPlan(appliedApp(app, form.values.inputs), [
      soundInput,
      ...shotListOrder,
    ])
    const rows = { app, form, lastSeed }
    return (
      <>
        <AppSettingRows {...rows} settings={plan.main} />
        {look}
        {plan.advanced.length === 0 ? null : (
          <AdvancedSection>
            <AppSettingRows {...rows} settings={plan.advanced} />
          </AdvancedSection>
        )}
      </>
    )
  }
  const plan = fieldSettingsPlan(settingFieldsOf(fields))
  return (
    <>
      <FieldRows fields={plan.main} form={form} />
      <CountField
        app={app}
        value={form.values.count}
        onChange={(count) => form.setForm({ count })}
      />
      {look}
      {plan.advanced.length === 0 ? null : (
        <AdvancedSection>
          <FieldRows fields={plan.advanced} form={form} />
        </AdvancedSection>
      )}
    </>
  )
}

export function ShotPanel({ app, screen }: PanelProps): ReactElement {
  const { state, start, picker } = screen
  const { form } = state
  return (
    <div data-slot="shot-parts" className="flex flex-1 flex-col gap-s4">
      {start === null ? null : (
        <VideoWells
          slots={{ start, references: null, last: null }}
          form={form}
        />
      )}
      <ScenePart screen={screen} />
      <CatalogPicker hosted={picker} place="row" />
      <ShotChoice screen={screen} list={movementList} />
      <ShotSettings app={app} screen={screen} />
    </div>
  )
}
