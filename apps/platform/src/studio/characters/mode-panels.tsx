import { Accordion } from "@base-ui/react/accordion"
import { takesPhotoAndPrompt } from "@rosesfield/catalog/characters"
import type { AppListing, InputDefinition } from "@rosesfield/contract"
import { IconButton } from "@rosesfield/ui/components/button"
import { Field as Field_, FieldNote } from "@rosesfield/ui/components/field"
import { cn } from "@rosesfield/ui/lib/cn"
import { motion } from "@rosesfield/ui/motion"
import { ChevronDownIcon, ShuffleIcon } from "lucide-react"
import type { ReactElement, ReactNode } from "react"
import { t, tCatalog, tCount } from "@/copy/t"
import type { CopyKey } from "@/copy.en"
import { aspectField } from "@/screens/app/app-form"
import { AppModelPicker } from "@/screens/app/bar/model-settings"
import { ChoiceField } from "@/screens/app/fields/choice-field"
import { textOf } from "@/screens/app/fields/field-props"
import { inputCaption, inputNote } from "@/screens/app/fields/input-copy"
import { InputField } from "@/screens/app/fields/input-field"
import { CountField } from "@/screens/app/fields/output-fields"
import {
  AdvancedSection,
  AppSettingRow,
  settingId,
} from "@/screens/app/fields/setting-rows"
import { CatalogPicker } from "@/screens/app/hosted/catalog-picker"
import { modelInputName } from "@/screens/app/hosted/hosted-form"
import type { HostedState } from "@/screens/app/hosted/use-hosted-model"
import {
  type AppSetting,
  appSettingsPlan,
  isSettingInput,
} from "@/screens/app/settings-plan"
import type { AppForm } from "@/screens/app/use-app-form"
import {
  countInput,
  isPanelInput,
  isTrait,
  modeField,
  randomTraits,
  viewInput,
} from "@/studio/characters/mode-listing"
import { foldSettings } from "@/studio/edit/edit-form"
import { imageFieldsOf } from "@/studio/image/image-fields"
import { HostedPanel } from "@/studio/image/image-settings"

type PanelProps = {
  app: AppListing
  form: AppForm
  lastSeed: number | null
}

type ChoiceInput = Extract<InputDefinition, { type: "choice" }>

function isChoice(input: InputDefinition): input is ChoiceInput {
  return input.type === "choice"
}

export function RandomButton({ app, form }: PanelProps): ReactElement {
  return (
    <IconButton
      label={tCatalog("characters.studio.random")}
      onClick={() => {
        for (const [name, value] of Object.entries(randomTraits(app))) {
          form.setInput(name, value)
        }
      }}
    >
      <ShuffleIcon aria-hidden="true" />
    </IconButton>
  )
}

type TraitGroupSpec = { key: string; title: CopyKey; names: string[] }

const leadingTraits: readonly string[] = ["gender", "age"]

const foldedSettings: readonly string[] = ["framing", "plainBackground"]

const traitGroups: readonly TraitGroupSpec[] = [
  {
    key: "body",
    title: "characters.traits.body",
    names: ["skinTone", "bodyType"],
  },
  {
    key: "hair",
    title: "characters.traits.hair",
    names: ["hairLength", "hairStyle", "hairColor"],
  },
  { key: "face", title: "characters.traits.face", names: ["eyeColor"] },
  { key: "clothes", title: "characters.traits.clothes", names: ["outfit"] },
]

function groupsOf(
  traits: readonly ChoiceInput[]
): Array<{ spec: TraitGroupSpec; inputs: ChoiceInput[] }> {
  const placed = new Set(traitGroups.flatMap((group) => group.names))
  const groups = traitGroups.map((spec) => ({
    spec,
    inputs: traits.filter((input) => spec.names.includes(input.name)),
  }))
  const [last] = groups.slice(-1)
  if (last !== undefined) {
    last.inputs.push(...traits.filter((input) => !placed.has(input.name)))
  }
  return groups.filter((group) => group.inputs.length > 0)
}

function ChoiceRow({
  app,
  input,
  form,
  note = inputNote(app, input),
}: {
  app: AppListing
  input: ChoiceInput
  form: AppForm
  note?: string | null
}): ReactElement {
  return (
    <ChoiceField
      label={inputCaption(input)}
      items={input.options.map((option) => ({
        value: option.value,
        label: tCatalog(option.labelKey),
      }))}
      value={textOf(form.values.inputs[input.name]) || input.default}
      onChange={(value) => form.setInput(input.name, value)}
      note={note}
      register={(focus) => form.register(input.name, focus)}
    />
  )
}

function TraitGroups({
  app,
  form,
  traits,
}: {
  app: AppListing
  form: AppForm
  traits: readonly ChoiceInput[]
}): ReactElement {
  const groups = groupsOf(traits)
  return (
    <Accordion.Root multiple defaultValue={[]} className="flex flex-col">
      {groups.map(({ spec, inputs }) => (
        <Accordion.Item
          key={spec.key}
          value={spec.key}
          className="border-b border-(--line)"
        >
          <Accordion.Header>
            <Accordion.Trigger
              className={cn(
                "group flex min-h-button w-full items-center gap-s3 py-s3 text-left [&_svg]:glyph",
                motion.tint
              )}
            >
              <span className="min-w-0 flex-1 truncate text-body font-medium">
                {t(spec.title)}
              </span>
              <span className="shrink-0 text-caption text-ink-muted">
                {tCount("characters.traits.count", inputs.length)}
              </span>
              <ChevronDownIcon
                aria-hidden="true"
                className={cn(
                  "shrink-0 text-ink-muted group-data-[panel-open]:rotate-180",
                  motion.control
                )}
              />
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Panel className="flex flex-col gap-s4 pb-s4">
            {inputs.map((input) => (
              <ChoiceRow key={input.name} app={app} input={input} form={form} />
            ))}
          </Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  )
}

function Field({
  app,
  form,
  input,
}: PanelProps & { input: InputDefinition }): ReactElement {
  return (
    <InputField
      app={app}
      input={input}
      value={form.values.inputs[input.name]}
      problem={form.problems.get(input.name)}
      onChange={(value) => form.setInput(input.name, value)}
      register={(focus) => form.register(input.name, focus)}
    />
  )
}

function hasCatalogPicker(hosted: HostedState | undefined): boolean {
  return hosted !== undefined && (hosted.isTaskApp || hosted.models.length > 0)
}

function isWordsInput(input: InputDefinition): boolean {
  return (
    isPanelInput(input) &&
    !isTrait(input) &&
    !isSettingInput(input) &&
    input.name !== modelInputName
  )
}

function placedOf(app: AppListing): string[] {
  return [modeField, viewInput, ...app.inputs.filter(isTrait).map(nameOf)]
}

const hostedOwned: readonly string[] = [aspectField, countInput, "seed"]

function nameOf(input: InputDefinition): string {
  return input.name
}

function SettingRows({
  settings,
  ...props
}: PanelProps & { settings: readonly AppSetting[] }): ReactNode {
  const { app, form } = props
  return settings.map((setting) => {
    if (setting.kind === "input" && setting.input.name === countInput) {
      return null
    }
    return setting.kind === "count" ? (
      <CountField
        key={settingId(setting)}
        app={app}
        value={form.values.count}
        onChange={(count) => {
          form.setInput(countInput, String(count))
          form.setForm({ count })
        }}
      />
    ) : (
      <AppSettingRow key={settingId(setting)} {...props} setting={setting} />
    )
  })
}

function GraphSettings(props: PanelProps): ReactElement {
  const plan = foldSettings(
    appSettingsPlan(props.app, placedOf(props.app)),
    foldedSettings
  )
  return (
    <>
      <SettingRows {...props} settings={plan.main} />
      {plan.advanced.length === 0 ? null : (
        <AdvancedSection>
          <SettingRows {...props} settings={plan.advanced} />
        </AdvancedSection>
      )}
    </>
  )
}

function ModelChip({
  app,
  form,
  hosted,
}: PanelProps & { hosted?: HostedState | undefined }): ReactElement | null {
  return hosted !== undefined && hasCatalogPicker(hosted) ? (
    <CatalogPicker hosted={hosted} place="row" />
  ) : (
    <AppModelPicker app={app} form={form} place="row" />
  )
}

export function TraitsPanel(
  props: PanelProps & { hosted?: HostedState | undefined }
): ReactElement {
  const { app, form, hosted } = props
  const traits = app.inputs.filter(isTrait).filter(isChoice)
  const leading = traits.filter((input) => leadingTraits.includes(input.name))
  const words = app.inputs.filter(isWordsInput)
  const fields = hosted?.fields ?? null
  return (
    <div className="flex flex-col gap-s4">
      {leading.map((input) => (
        <ChoiceRow key={input.name} app={app} input={input} form={form} />
      ))}
      <TraitGroups
        app={app}
        form={form}
        traits={traits.filter((input) => !leadingTraits.includes(input.name))}
      />
      {words.map((input) => (
        <Field key={input.name} {...props} input={input} />
      ))}
      {hosted === undefined || fields === null ? (
        <>
          <ModelChip {...props} />
          <GraphSettings {...props} />
        </>
      ) : (
        <>
          <HostedPanel
            app={app}
            hosted={hosted}
            fields={imageFieldsOf(fields)}
            form={form}
          />
          <SettingRows
            {...props}
            settings={
              appSettingsPlan(app, [...placedOf(app), ...hostedOwned]).main
            }
          />
        </>
      )}
    </div>
  )
}

function noPhotoNoteOf(hosted: HostedState | undefined): string | null {
  const fields = hosted?.fields ?? null
  return fields === null || takesPhotoAndPrompt(fields)
    ? null
    : tCatalog("video.well.none")
}

export function AnglesPanel(
  props: PanelProps & { hosted?: HostedState | undefined }
): ReactElement {
  const { app } = props
  const noPhoto = noPhotoNoteOf(props.hosted)
  return (
    <div className="flex flex-col gap-s4">
      {app.inputs.filter(isWordsInput).map((input) => (
        <Field key={input.name} {...props} input={input} />
      ))}
      <Field_ className="max-w-none">
        <AppModelPicker app={app} form={props.form} place="row" />
        {noPhoto === null ? null : <FieldNote>{noPhoto}</FieldNote>}
      </Field_>
      <GraphSettings {...props} />
    </div>
  )
}
