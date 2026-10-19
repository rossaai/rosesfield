import {
  Button,
  type ButtonProps,
  IconButton,
  type IconButtonProps,
} from "@rosesfield/ui/components/button"
import { Checkbox } from "@rosesfield/ui/components/checkbox"
import {
  RadioGroup,
  RadioGroupItem,
} from "@rosesfield/ui/components/radio-group"
import { SegmentedControl } from "@rosesfield/ui/components/segmented-control"
import { Slider } from "@rosesfield/ui/components/slider"
import { Switch } from "@rosesfield/ui/components/switch"
import {
  AtSignIcon,
  EllipsisIcon,
  PaperclipIcon,
  Trash2Icon,
} from "lucide-react"
import { type ReactElement, type ReactNode, useState } from "react"
import { type GalleryKey, t } from "@/gallery/copy.en"
import type { GalleryEntry } from "@/gallery/gallery-entry"

const tones: ReadonlyArray<NonNullable<ButtonProps["tone"]>> = [
  "default",
  "primary",
  "quiet",
  "danger",
]

const iconSizes: ReadonlyArray<NonNullable<IconButtonProps["size"]>> = [
  "default",
  "dense",
  "small",
  "badge",
]

function Row({ children }: { children: ReactNode }): ReactElement {
  return <div className="flex flex-wrap items-center gap-s2">{children}</div>
}

function Labelled({
  label,
  children,
}: {
  label: GalleryKey
  children: ReactNode
}): ReactElement {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: each Base UI control passed in renders its own input inside this label
    <label className="flex items-center gap-s3 text-body">
      {children}
      {t(label)}
    </label>
  )
}

function SegmentedDemo({ count }: { count: 2 | 3 | 4 }): ReactElement {
  const all = [
    { value: "1-1", label: "1:1" },
    { value: "4-3", label: "4:3" },
    { value: "16-9", label: "16:9" },
    { value: "9-16", label: "9:16" },
  ]
  const items = all.slice(0, count)
  const [value, setValue] = useState(items[0]?.value ?? "1-1")
  return (
    <SegmentedControl
      label={t("sample.format")}
      items={items}
      value={value}
      onValueChange={setValue}
    />
  )
}

const button: GalleryEntry = {
  id: "button",
  title: "entry.button",
  states: [
    {
      id: "tones",
      label: "state.tones",
      render: () => (
        <Row>
          {tones.map((tone) => (
            <Button key={tone} tone={tone}>
              {tone === "danger" ? t("sample.delete") : t("sample.generate")}
            </Button>
          ))}
        </Row>
      ),
    },
    {
      id: "sizes",
      label: "state.sizes",
      render: () => (
        <Row>
          <Button>{t("sample.save")}</Button>
          <Button size="dense">{t("sample.save")}</Button>
          <Button size="small">{t("sample.save")}</Button>
        </Row>
      ),
    },
    {
      id: "disabled",
      label: "state.disabled",
      render: () => (
        <Row>
          <Button disabled>{t("sample.save")}</Button>
          <Button tone="primary" disabled>
            {t("sample.generate")}
          </Button>
        </Row>
      ),
    },
    {
      id: "busy",
      label: "state.busy",
      render: () => (
        <Row>
          <Button tone="primary" busy>
            {t("sample.generate")}
          </Button>
        </Row>
      ),
    },
  ],
}

const iconButton: GalleryEntry = {
  id: "icon-button",
  title: "entry.iconButton",
  states: [
    {
      id: "tones",
      label: "state.tones",
      render: () => (
        <Row>
          <IconButton label={t("sample.attach")}>
            <PaperclipIcon aria-hidden="true" />
          </IconButton>
          <IconButton label={t("sample.mention")} tone="quiet">
            <AtSignIcon aria-hidden="true" />
          </IconButton>
          <IconButton label={t("sample.more")} tone="primary">
            <EllipsisIcon aria-hidden="true" />
          </IconButton>
          <IconButton label={t("sample.delete")} tone="danger">
            <Trash2Icon aria-hidden="true" />
          </IconButton>
        </Row>
      ),
    },
    {
      id: "sizes",
      label: "state.sizes",
      render: () => (
        <Row>
          {iconSizes.map((size) => (
            <IconButton key={size} label={t("sample.attach")} size={size}>
              <PaperclipIcon aria-hidden="true" />
            </IconButton>
          ))}
        </Row>
      ),
    },
    {
      id: "disabled",
      label: "state.disabled",
      render: () => (
        <IconButton label={t("sample.attach")} disabled>
          <PaperclipIcon aria-hidden="true" />
        </IconButton>
      ),
    },
  ],
}

const segmented: GalleryEntry = {
  id: "segmented-control",
  title: "entry.segmented",
  states: [
    {
      id: "two",
      label: "state.two",
      render: () => <SegmentedDemo count={2} />,
    },
    {
      id: "three",
      label: "state.three",
      render: () => <SegmentedDemo count={3} />,
    },
    {
      id: "four",
      label: "state.four",
      render: () => <SegmentedDemo count={4} />,
    },
  ],
}

const switches: GalleryEntry = {
  id: "switch",
  title: "entry.switch",
  states: [
    {
      id: "off-on",
      label: "state.value",
      render: () => (
        <Row>
          <Labelled label="state.off">
            <Switch />
          </Labelled>
          <Labelled label="state.on">
            <Switch defaultChecked />
          </Labelled>
          <Labelled label="state.disabled">
            <Switch disabled />
          </Labelled>
        </Row>
      ),
    },
  ],
}

const slider: GalleryEntry = {
  id: "slider",
  title: "entry.slider",
  states: [
    {
      id: "value",
      label: "state.value",
      render: () => (
        <Slider aria-label={t("sample.length")} defaultValue={40} />
      ),
    },
    {
      id: "disabled",
      label: "state.disabled",
      render: () => (
        <Slider aria-label={t("sample.length")} defaultValue={40} disabled />
      ),
    },
  ],
}

const checkbox: GalleryEntry = {
  id: "checkbox",
  title: "entry.checkbox",
  states: [
    {
      id: "value",
      label: "state.value",
      render: () => (
        <Row>
          <Labelled label="state.off">
            <Checkbox />
          </Labelled>
          <Labelled label="state.on">
            <Checkbox defaultChecked />
          </Labelled>
          <Labelled label="state.disabled">
            <Checkbox disabled />
          </Labelled>
        </Row>
      ),
    },
  ],
}

const radio: GalleryEntry = {
  id: "radio",
  title: "entry.radio",
  states: [
    {
      id: "value",
      label: "state.value",
      render: () => (
        <RadioGroup aria-label={t("sample.source")} defaultValue="upload">
          <Labelled label="sample.source.upload">
            <RadioGroupItem value="upload" />
          </Labelled>
          <Labelled label="sample.source.library">
            <RadioGroupItem value="library" />
          </Labelled>
        </RadioGroup>
      ),
    },
  ],
}

export const controlEntries: GalleryEntry[] = [
  button,
  iconButton,
  segmented,
  switches,
  slider,
  checkbox,
  radio,
]
