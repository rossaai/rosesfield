import { Accordion } from "@base-ui/react/accordion"
import { takesPhotoAndPrompt } from "@rosesfield/catalog/characters"
import type { AppListing, InputDefinition } from "@rosesfield/contract"
import { IconButton } from "@rosesfield/ui/components/button"
import { cn } from "@rosesfield/ui/lib/cn"
import { motion } from "@rosesfield/ui/motion"
import { ChevronDownIcon, ShuffleIcon } from "lucide-react"
import type { ReactElement } from "react"
import { t, tCatalog, tCount } from "@/copy/t"
import type { CopyKey } from "@/copy.en"
import { ChoiceField } from "@/screens/app/fields/choice-field"
import { textOf } from "@/screens/app/fields/field-props"
import { inputCaption, inputNote } from "@/screens/app/fields/input-copy"
import { InputField } from "@/screens/app/fields/input-field"
import { AspectField, CountField } from "@/screens/app/fields/output-fields"
import { CatalogPicker } from "@/screens/app/hosted/catalog-picker"
import { modelInputName } from "@/screens/app/hosted/hosted-form"
import type { HostedState } from "@/screens/app/hosted/use-hosted-model"
import { AdvancedFields } from "@/screens/app/inputs-panel"
import type { AppForm } from "@/screens/app/use-app-form"
import {
  countInput,
  isPanelInput,
  isTrait,
  randomTraits,
} from "@/studio/characters/mode-listing"
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

const traitGroups: readonly TraitGroupSpec[] = [
  {
    key: "body",
    title: "characters.traits.body",
    names: ["gender", "age", "skinTone", "bodyType"],
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
  const [first] = groups
  return (
    <Accordion.Root
      multiple
      defaultValue={first === undefined ? [] : [first.spec.key]}
      className="flex flex-col"
    >
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

function isWordsInput(input: InputDefinition, hasPicker: boolean): boolean {
  return (
    isPanelInput(input) &&
    !isTrait(input) &&
    !(hasPicker && input.name === modelInputName)
  )
}

export function TraitsPanel(
  props: PanelProps & { hosted?: HostedState | undefined }
): ReactElement {
  const { app, form, hosted } = props
  const traits = app.inputs.filter(isTrait).filter(isChoice)
  const hasPicker = hasCatalogPicker(hosted)
  const rest = app.inputs.filter((one) => isWordsInput(one, hasPicker))
  const fields = hosted?.fields ?? null
  return (
    <div className="flex flex-col gap-s4">
      <TraitGroups app={app} form={form} traits={traits} />
      {rest.map((input) => (
        <Field key={input.name} {...props} input={input} />
      ))}
      {hosted === undefined || !hasPicker ? null : fields === null ? (
        <CatalogPicker hosted={hosted} place="row" />
      ) : (
        <HostedPanel
          app={app}
          hosted={hosted}
          fields={imageFieldsOf(fields)}
          form={form}
        />
      )}
      {fields === null ? <GraphOutputFields {...props} /> : null}
    </div>
  )
}

function GraphOutputFields(props: PanelProps): ReactElement {
  const { app, form } = props
  return (
    <>
      <AspectField
        app={app}
        value={form.values.aspectRatio}
        onChange={(aspectRatio) => form.setForm({ aspectRatio })}
      />
      <CountField
        app={app}
        value={form.values.count}
        onChange={(count) => {
          form.setInput(countInput, String(count))
          form.setForm({ count })
        }}
      />
      <AdvancedFields {...props} />
    </>
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
  const { app, form, hosted } = props
  const noPhoto = noPhotoNoteOf(hosted)
  return (
    <div className="flex flex-col gap-s4">
      {app.inputs
        .filter(isPanelInput)
        .map((input) =>
          noPhoto !== null &&
          input.name === modelInputName &&
          isChoice(input) ? (
            <ChoiceRow
              key={input.name}
              app={app}
              input={input}
              form={form}
              note={noPhoto}
            />
          ) : (
            <Field key={input.name} {...props} input={input} />
          )
        )}
      <AdvancedFields {...props} />
    </div>
  )
}
