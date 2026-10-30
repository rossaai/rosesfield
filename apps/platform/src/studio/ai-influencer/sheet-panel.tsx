import { Accordion } from "@base-ui/react/accordion"
import {
  anyValue,
  optionKeyOf,
  photoInput,
  photoModel,
  sheetModel,
  type TraitSection,
  traitInputNames,
} from "@rosesfield/catalog/ai-influencer"
import type { AppListing, InputDefinition } from "@rosesfield/contract"
import { IconButton } from "@rosesfield/ui/components/button"
import { Checkbox } from "@rosesfield/ui/components/checkbox"
import { cn } from "@rosesfield/ui/lib/cn"
import { motion } from "@rosesfield/ui/motion"
import { ChevronDownIcon, ShuffleIcon } from "lucide-react"
import type { ReactElement } from "react"
import { tCatalog } from "@/copy/t"
import type { FieldValue } from "@/screens/app/app-form"
import { AppModelPicker } from "@/screens/app/bar/model-settings"
import { ChoiceField } from "@/screens/app/fields/choice-field"
import { textOf } from "@/screens/app/fields/field-props"
import { inputNote } from "@/screens/app/fields/input-copy"
import { InputField } from "@/screens/app/fields/input-field"
import { CatalogPicker } from "@/screens/app/hosted/catalog-picker"
import { modelInputName } from "@/screens/app/hosted/hosted-form"
import type { HostedState } from "@/screens/app/hosted/use-hosted-model"
import type { AppForm } from "@/screens/app/use-app-form"
import {
  isMulti,
  pickedOf,
  randomUnit,
  shuffledTraits,
  togglePick,
  traitGroups,
} from "@/studio/ai-influencer/sheet-traits"
import { imageFieldsOf } from "@/studio/image/image-fields"
import { HostedPanel } from "@/studio/image/image-settings"

type PanelProps = { app: AppListing; form: AppForm }

const detailsInput = "details"

const keptNames: readonly string[] = [
  ...traitInputNames,
  detailsInput,
  photoInput,
]

function inputOf(app: AppListing, name: string): InputDefinition | undefined {
  return app.inputs.find((input) => input.name === name)
}

function setAll(form: AppForm, values: Readonly<Record<string, string>>): void {
  for (const [name, value] of Object.entries(values)) {
    form.setInput(name, value)
  }
}

function SingleSection({
  app,
  form,
  section,
}: PanelProps & { section: TraitSection }): ReactElement | null {
  const input = inputOf(app, section.name)
  if (input === undefined) {
    return null
  }
  return (
    <ChoiceField
      label={tCatalog(input.labelKey)}
      items={section.values.map((value) => ({
        value,
        label: tCatalog(optionKeyOf(section.name, value)),
      }))}
      value={textOf(form.values.inputs[section.name]) || anyValue}
      onChange={(value) => form.setInput(section.name, value)}
      setting={section.name}
      note={inputNote(app, input)}
      register={(focus) => form.register(section.name, focus)}
    />
  )
}

function MultiSection({
  form,
  section,
}: PanelProps & { section: TraitSection }): ReactElement {
  const picked = pickedOf(section, form.values.inputs)
  const isFull = picked.length >= section.slots
  return (
    <fieldset className="flex flex-col gap-s2">
      <legend className="text-body font-medium">
        {tCatalog(`aiInfluencer.section.${section.name}`)}
      </legend>
      <p className="text-caption text-ink-muted">
        {tCatalog("aiInfluencer.section.pickUpTo", { count: section.slots })}
      </p>
      <div className="grid grid-cols-2 gap-s2">
        {section.values
          .filter((value) => value !== anyValue)
          .map((value) => {
            const isPicked = picked.includes(value)
            const id = `${section.name}-${value}`
            return (
              <label
                key={value}
                htmlFor={id}
                className="flex items-center gap-s2 text-body"
              >
                <Checkbox
                  id={id}
                  checked={isPicked}
                  disabled={isFull && !isPicked}
                  onCheckedChange={() =>
                    setAll(form, togglePick(section, form.values.inputs, value))
                  }
                />
                <span className="min-w-0 truncate">
                  {tCatalog(optionKeyOf(section.name, value))}
                </span>
              </label>
            )
          })}
      </div>
    </fieldset>
  )
}

function Section(
  props: PanelProps & { section: TraitSection }
): ReactElement | null {
  return isMulti(props.section) ? (
    <MultiSection {...props} />
  ) : (
    <SingleSection {...props} />
  )
}

function TraitAccordion(props: PanelProps): ReactElement {
  const [lead, ...rest] = traitGroups
  return (
    <div className="flex flex-col gap-s4">
      {lead?.sections.map((section) => (
        <Section key={section.name} {...props} section={section} />
      ))}
      <Accordion.Root multiple defaultValue={[]} className="flex flex-col">
        {rest.map((group) => (
          <Accordion.Item
            key={group.key}
            value={group.key}
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
                  {tCatalog(`aiInfluencer.group.${group.key}`)}
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
              {group.sections.map((section) => (
                <Section key={section.name} {...props} section={section} />
              ))}
            </Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion.Root>
    </div>
  )
}

function photoFieldOf(app: AppListing): InputDefinition | undefined {
  const input = inputOf(app, photoInput)
  return input?.type === "image"
    ? { ...input, presence: "optional", when: [] }
    : undefined
}

function PhotoField({ app, form }: PanelProps): ReactElement | null {
  const input = photoFieldOf(app)
  if (input === undefined) {
    return null
  }
  return (
    <InputField
      app={app}
      input={input}
      value={form.values.inputs[photoInput]}
      problem={form.problems.get(photoInput)}
      onChange={(value) => {
        const isGiven = Array.isArray(value) && value.length > 0
        const model = textOf(form.values.inputs[modelInputName])
        form.setInput(photoInput, value)
        if (isGiven && model !== photoModel) {
          form.setInput(modelInputName, photoModel)
        }
        if (!isGiven && model === photoModel) {
          form.setInput(modelInputName, sheetModel)
        }
      }}
      register={(focus) => form.register(photoInput, focus)}
    />
  )
}

function DetailsField({ app, form }: PanelProps): ReactElement | null {
  const input = inputOf(app, detailsInput)
  return input === undefined ? null : (
    <InputField
      app={app}
      input={input}
      value={form.values.inputs[detailsInput]}
      problem={form.problems.get(detailsInput)}
      onChange={(value) => form.setInput(detailsInput, value)}
      register={(focus) => form.register(detailsInput, focus)}
    />
  )
}

function ModelRow({
  app,
  form,
  hosted,
}: PanelProps & { hosted: HostedState | undefined }): ReactElement | null {
  const fields = hosted?.fields ?? null
  if (hosted === undefined || !(hosted.isTaskApp || hosted.models.length > 0)) {
    return <AppModelPicker app={app} form={form} place="row" />
  }
  const kept: HostedState = {
    ...hosted,
    choose: (id) => {
      const held = keptNames.flatMap((name): Array<[string, FieldValue]> => {
        const value = form.values.inputs[name]
        return value === undefined ? [] : [[name, value]]
      })
      hosted.choose(id)
      for (const [name, value] of held) {
        form.setInput(name, value)
      }
    },
  }
  return (
    <>
      <CatalogPicker hosted={kept} place="row" />
      {fields === null ? null : (
        <HostedPanel
          app={app}
          hosted={kept}
          fields={imageFieldsOf(fields)}
          form={form}
        />
      )}
    </>
  )
}

export function SheetPanel(
  props: PanelProps & { hosted: HostedState | undefined }
): ReactElement {
  return (
    <div className="flex flex-col gap-s4">
      <PhotoField {...props} />
      <TraitAccordion {...props} />
      <DetailsField {...props} />
      <ModelRow {...props} />
    </div>
  )
}

export function ShuffleButton({ form }: { form: AppForm }): ReactElement {
  return (
    <IconButton
      label={tCatalog("aiInfluencer.studio.shuffle")}
      onClick={() => setAll(form, shuffledTraits(randomUnit))}
    >
      <ShuffleIcon aria-hidden="true" />
    </IconButton>
  )
}
