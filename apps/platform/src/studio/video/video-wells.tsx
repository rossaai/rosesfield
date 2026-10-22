import { Chip } from "@rosesfield/ui/components/chip"
import { Field, FieldMessage } from "@rosesfield/ui/components/field"
import { AtSignIcon } from "lucide-react"
import { type ReactElement, useState } from "react"
import { t, tCatalog } from "@/copy/t"
import { DropWell } from "@/pieces/drop-well"
import { LibraryPicker } from "@/pieces/library-picker"
import { listOf } from "@/screens/app/fields/field-props"
import type { AppForm } from "@/screens/app/use-app-form"
import type { ImageSlots } from "@/studio/video/video-tabs"

type Slot = { name: string; max: number }

function Well({
  slot,
  titleKey,
  form,
}: {
  slot: Slot
  titleKey: string
  form: AppForm
}): ReactElement {
  const [message, setMessage] = useState<string | null>(null)
  const problem = form.problems.get(slot.name)
  const shown =
    message ?? (problem === undefined ? null : t(problem.key, problem.values))
  return (
    <Field invalid={shown !== null} className="max-w-none flex-1">
      <DropWell
        fill
        kind="image"
        title={tCatalog(titleKey)}
        ids={listOf(form.values.inputs[slot.name])}
        max={slot.max}
        onChange={(ids) => form.setInput(slot.name, ids)}
        onMessage={setMessage}
      />
      {shown === null ? null : <FieldMessage>{shown}</FieldMessage>}
    </Field>
  )
}

export function ElementsChip({
  slots,
  form,
}: {
  slots: ImageSlots
  form: AppForm
}): ReactElement | null {
  const [isOpen, setOpen] = useState(false)
  const open = [slots.references, slots.start, slots.last].filter(
    (slot): slot is Slot => slot !== null
  )
  if (open.length === 0) {
    return null
  }
  const heldOf = (slot: Slot): string[] => listOf(form.values.inputs[slot.name])
  const slot =
    open.find((one) => heldOf(one).length < one.max) ?? open[0] ?? null
  if (slot === null) {
    return null
  }
  const held = heldOf(slot)
  return (
    <>
      <Chip
        icon={<AtSignIcon aria-hidden="true" />}
        disabled={held.length >= slot.max}
        onClick={() => setOpen(true)}
      >
        {t("bar.elements")}
      </Chip>
      <LibraryPicker
        open={isOpen}
        onOpenChange={setOpen}
        kind="image"
        max={slot.max - held.length}
        title={t("bar.addMenu.fromLibrary")}
        onDone={(picked) =>
          form.setInput(slot.name, [...held, ...picked].slice(0, slot.max))
        }
      />
    </>
  )
}

export function VideoWells({
  slots,
  form,
}: {
  slots: ImageSlots
  form: AppForm
}): ReactElement {
  const { start, references, last } = slots
  if (start === null && references === null && last === null) {
    return (
      <p className="text-label text-ink-muted">{tCatalog("video.well.none")}</p>
    )
  }
  const isPair = start !== null && last !== null
  return (
    <div
      data-slot="video-wells"
      className={
        isPair ? "grid flex-1 grid-cols-2 gap-2" : "flex flex-1 flex-col gap-2"
      }
    >
      {start === null ? null : (
        <Well
          slot={start}
          form={form}
          titleKey={isPair ? "video.well.first" : "video.well.start"}
        />
      )}
      {references === null ? null : (
        <Well slot={references} form={form} titleKey="video.well.references" />
      )}
      {last === null ? null : (
        <Well slot={last} form={form} titleKey="video.well.last" />
      )}
    </div>
  )
}
