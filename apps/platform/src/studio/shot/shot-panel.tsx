import type { AppListing } from "@rosesfield/contract"
import { PromptBlock } from "@rosesfield/ui/components/input-panel"
import type { ReactElement, ReactNode } from "react"
import { t, tCatalog } from "@/copy/t"
import { ChoiceField } from "@/screens/app/fields/choice-field"
import { CountField } from "@/screens/app/fields/output-fields"
import { SeedField } from "@/screens/app/fields/seed-field"
import { CatalogPicker } from "@/screens/app/hosted/catalog-picker"
import { HostedFields } from "@/screens/app/hosted/hosted-fields"
import { randomSeed } from "@/screens/app/inputs-panel"
import { choiceKeyOf, choiceValuesOf } from "@/studio/shot/shot-prompt"
import type { ShotScreen } from "@/studio/shot/use-shot-screen"
import { SoundChip, VideoChips } from "@/studio/video/video-chips"
import { VideoWells } from "@/studio/video/video-wells"
import { shotListOrder } from "../../../../../packages/catalog/src/shot/shot-words"

type PanelProps = {
  app: AppListing
  screen: ShotScreen
}

const soundInput = "sound"

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

function ScenePart({ app, screen }: PanelProps): ReactElement {
  const { state, promptName, shot, isGraph, fields, hosted } = screen
  const problem = state.form.problems.get(promptName)
  const label = tCatalog("shot.input.prompt.label")
  const hasGraphSound = app.inputs.some((input) => input.name === soundInput)
  return (
    <div className="flex flex-col gap-1">
      <PromptBlock
        label={label}
        chips={
          <SoundChip
            form={state.form}
            fields={fields}
            isGraph={isGraph && hasGraphSound}
            makesSound={
              hosted.chosen?.tags.some((one) => one.kind === "sound") === true
            }
          />
        }
      >
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

function ShotChoices({ screen }: { screen: ShotScreen }): ReactElement {
  return (
    <div data-slot="shot-choices" className="grid grid-cols-2 gap-2">
      {shotListOrder.map((list) => (
        <ChoiceField
          key={list}
          label={tCatalog(`shot.input.${list}.label`)}
          items={choiceValuesOf(list).map((value) => ({
            value,
            label: tCatalog(choiceKeyOf(list, value)),
          }))}
          value={screen.shot.choices[list]}
          onChange={(value) => screen.setChoice(list, value)}
          note={null}
        />
      ))}
    </div>
  )
}

function GraphSeed({ app, screen }: PanelProps): ReactNode {
  const { form, lastSeed } = screen.state
  const seed = app.inputs.find((input) => input.type === "seed")
  if (seed === undefined) {
    return null
  }
  const value = form.values.inputs[seed.name]
  return (
    <SeedField
      mode={form.values.seedMode}
      value={value}
      onMode={(mode) => {
        form.setForm({ seedMode: mode })
        if (mode === "fixed" && typeof value !== "number") {
          form.setInput(seed.name, lastSeed ?? randomSeed())
        }
      }}
      onChange={(next) => form.setInput(seed.name, next)}
    />
  )
}

export function hasAdvanced(app: AppListing, screen: ShotScreen): boolean {
  return screen.fields === null
    ? app.inputs.some((input) => input.type === "seed")
    : screen.fields.rest.length > 0
}

function Advanced({ app, screen }: PanelProps): ReactNode {
  const { fields, state } = screen
  if (!hasAdvanced(app, screen)) {
    return null
  }
  return (
    <>
      {fields === null ? (
        <GraphSeed app={app} screen={screen} />
      ) : (
        <HostedFields fields={fields.rest} form={state.form} />
      )}
    </>
  )
}

export function ShotPanel({ app, screen }: PanelProps): ReactElement {
  const { state, fields, start, picker } = screen
  const { form } = state
  return (
    <div data-slot="shot-parts" className="flex flex-1 flex-col gap-2">
      <ScenePart app={app} screen={screen} />
      {start === null ? null : (
        <VideoWells
          slots={{ start, references: null, last: null }}
          form={form}
        />
      )}
      <CatalogPicker hosted={picker} place="row" />
      <ShotChoices screen={screen} />
      <VideoChips app={app} form={form} fields={fields} />
      <CountField
        app={app}
        value={form.values.count}
        onChange={(count) => form.setForm({ count })}
      />
      {fields === null ? null : (
        <HostedFields fields={fields.required} form={form} />
      )}
      <Advanced app={app} screen={screen} />
    </div>
  )
}
