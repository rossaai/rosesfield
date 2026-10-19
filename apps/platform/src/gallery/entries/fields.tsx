import {
  Field,
  FieldCaption,
  FieldMessage,
  FieldNote,
} from "@rosesfield/ui/components/field"
import { Input } from "@rosesfield/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@rosesfield/ui/components/select"
import { Textarea } from "@rosesfield/ui/components/textarea"
import { type ReactElement, useState } from "react"
import { t } from "@/gallery/copy.en"
import type { GalleryEntry } from "@/gallery/gallery-entry"

const resolutions = [
  { value: "480p", label: "480p" },
  { value: "720p", label: "720p" },
  { value: "1080p", label: "1080p" },
  { value: "1k", label: "1K" },
  { value: "2k", label: "2K" },
  { value: "4k", label: "4K" },
]

type NameFieldProps = {
  value?: string
  invalid?: boolean
  disabled?: boolean
}

function NameField({
  value = "",
  invalid = false,
  disabled = false,
}: NameFieldProps): ReactElement {
  const [text, setText] = useState(value)
  return (
    <Field invalid={invalid} disabled={disabled}>
      <FieldCaption>
        {t("sample.name.caption")}
        <span>{t("sample.optional")}</span>
      </FieldCaption>
      <Input
        value={text}
        placeholder={t("sample.name.placeholder")}
        onChange={(event) => setText(event.target.value)}
      />
      {invalid ? (
        <FieldMessage>{t("sample.name.message")}</FieldMessage>
      ) : (
        <FieldNote>{t("sample.name.note")}</FieldNote>
      )}
    </Field>
  )
}

function PromptField({ value = "" }: { value?: string }): ReactElement {
  const [text, setText] = useState(value)
  return (
    <Field>
      <FieldCaption>{t("sample.prompt.caption")}</FieldCaption>
      <Textarea
        value={text}
        placeholder={t("sample.prompt.placeholder")}
        onChange={(event) => setText(event.target.value)}
      />
    </Field>
  )
}

function ResolutionField({
  value,
  disabled = false,
  open,
}: {
  value: string | null
  disabled?: boolean
  open?: boolean
}): ReactElement {
  return (
    <Field disabled={disabled}>
      <FieldCaption>{t("sample.resolution.caption")}</FieldCaption>
      <Select
        items={resolutions}
        defaultValue={value}
        disabled={disabled}
        {...(open === undefined ? {} : { defaultOpen: open })}
      >
        <SelectTrigger>
          <SelectValue placeholder={t("sample.resolution.placeholder")} />
        </SelectTrigger>
        <SelectContent>
          {resolutions.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  )
}

const input: GalleryEntry = {
  id: "input",
  title: "entry.input",
  states: [
    { id: "empty", label: "state.empty", render: () => <NameField /> },
    {
      id: "filled",
      label: "state.filled",
      render: () => <NameField value={t("sample.name.value")} />,
    },
    {
      id: "invalid",
      label: "state.invalid",
      render: () => <NameField invalid />,
    },
    {
      id: "disabled",
      label: "state.disabled",
      render: () => <NameField value={t("sample.name.value")} disabled />,
    },
  ],
}

const textarea: GalleryEntry = {
  id: "textarea",
  title: "entry.textarea",
  states: [
    { id: "empty", label: "state.empty", render: () => <PromptField /> },
    {
      id: "one-line",
      label: "state.oneLine",
      render: () => <PromptField value={t("sample.prompt.short")} />,
    },
    {
      id: "six-lines",
      label: "state.sixLines",
      render: () => <PromptField value={t("sample.prompt.long")} />,
    },
  ],
}

const select: GalleryEntry = {
  id: "select",
  title: "entry.select",
  states: [
    {
      id: "empty",
      label: "state.empty",
      render: () => <ResolutionField value={null} />,
    },
    {
      id: "filled",
      label: "state.filled",
      render: () => <ResolutionField value="1080p" />,
    },
    {
      id: "disabled",
      label: "state.disabled",
      render: () => <ResolutionField value="1080p" disabled />,
    },
    {
      id: "open",
      label: "state.open",
      placement: "layer",
      render: () => <ResolutionField value="1080p" open />,
    },
  ],
}

export const fieldEntries: GalleryEntry[] = [input, textarea, select]
