import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@rosesfield/ui/components/avatar"
import { Badge } from "@rosesfield/ui/components/badge"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@rosesfield/ui/components/card"
import { Kbd, KbdGroup } from "@rosesfield/ui/components/kbd"
import { Progress, ProgressLabel } from "@rosesfield/ui/components/progress"
import { ScrollArea } from "@rosesfield/ui/components/scroll-area"
import { Separator } from "@rosesfield/ui/components/separator"
import { Skeleton } from "@rosesfield/ui/components/skeleton"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@rosesfield/ui/components/tabs"
import type { ReactElement } from "react"
import { type GalleryKey, t } from "@/gallery/copy.en"
import demoSquare from "@/gallery/fixtures/demo-image-1-1.png"
import type { GalleryEntry } from "@/gallery/gallery-entry"

const rowKeys: GalleryKey[] = [
  "sample.row.image",
  "sample.row.video",
  "sample.row.voice",
  "sample.row.recast",
  "sample.row.motion",
  "sample.row.effects",
  "sample.row.shot",
  "sample.row.upscale",
]

function Rows({ keys }: { keys: GalleryKey[] }): ReactElement {
  return (
    <ul className="flex flex-col">
      {keys.map((key, index) => (
        <li key={key} className="flex flex-col">
          {index === 0 ? null : <Separator />}
          <span className="py-s3 text-body">{t(key)}</span>
        </li>
      ))}
    </ul>
  )
}

const tabs: GalleryEntry = {
  id: "tabs",
  title: "entry.tabs",
  states: [
    {
      id: "value",
      label: "state.value",
      render: () => (
        <Tabs defaultValue="image">
          <TabsList>
            <TabsTrigger value="image">{t("sample.kind.image")}</TabsTrigger>
            <TabsTrigger value="video">{t("sample.kind.video")}</TabsTrigger>
            <TabsTrigger value="audio">{t("sample.kind.audio")}</TabsTrigger>
          </TabsList>
          <TabsContent value="image">{t("sample.tab.image")}</TabsContent>
          <TabsContent value="video">{t("sample.tab.video")}</TabsContent>
          <TabsContent value="audio">{t("sample.tab.audio")}</TabsContent>
        </Tabs>
      ),
    },
  ],
}

const card: GalleryEntry = {
  id: "card",
  title: "entry.card",
  states: [
    {
      id: "on-canvas",
      label: "state.onCanvas",
      render: () => (
        <Card className="max-w-prose-max">
          <CardHeader>
            <CardTitle>{t("sample.card.title")}</CardTitle>
            <CardDescription>{t("sample.card.body")}</CardDescription>
          </CardHeader>
        </Card>
      ),
    },
    {
      id: "on-surface",
      label: "state.onSurface",
      render: () => (
        <div data-ground="surface" className="rounded-card bg-surface p-s4">
          <Card ground="canvas">
            <CardHeader>
              <CardTitle>{t("sample.card.surface")}</CardTitle>
              <CardDescription>{t("sample.card.surfaceBody")}</CardDescription>
            </CardHeader>
          </Card>
        </div>
      ),
    },
  ],
}

const skeleton: GalleryEntry = {
  id: "skeleton",
  title: "entry.skeleton",
  states: [
    {
      id: "shapes",
      label: "state.shapes",
      render: () => (
        <div className="flex w-full items-center gap-s4">
          <Skeleton className="size-tile" />
          <Skeleton shape="circle" size="touch" />
          <div className="flex min-w-0 flex-1 flex-col gap-s2">
            <Skeleton shape="line" measure="long" />
            <Skeleton shape="line" measure="mid" />
            <Skeleton shape="line" measure="short" />
          </div>
        </div>
      ),
    },
  ],
}

const progress: GalleryEntry = {
  id: "progress",
  title: "entry.progress",
  states: [
    {
      id: "fractions",
      label: "state.fractions",
      render: () => (
        <div className="flex flex-col gap-s4">
          {[0, 40, 100].map((value) => (
            <Progress key={value} value={value} className="max-w-field-max">
              <ProgressLabel>{t("sample.progress")}</ProgressLabel>
            </Progress>
          ))}
        </div>
      ),
    },
  ],
}

const avatar: GalleryEntry = {
  id: "avatar",
  title: "entry.avatar",
  states: [
    {
      id: "image-initials",
      label: "state.image",
      render: () => (
        <div className="flex items-center gap-s2">
          <Avatar>
            <AvatarImage src={demoSquare} alt={t("sample.avatar")} />
            <AvatarFallback>{t("sample.avatar.initials")}</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarFallback>{t("sample.avatar.initials")}</AvatarFallback>
          </Avatar>
          <Avatar size="small">
            <AvatarFallback>{t("sample.avatar.initials")}</AvatarFallback>
          </Avatar>
        </div>
      ),
    },
  ],
}

const badge: GalleryEntry = {
  id: "badge",
  title: "entry.badge",
  states: [
    {
      id: "kinds",
      label: "state.badgeKinds",
      render: () => (
        <div className="flex flex-wrap items-center gap-s2">
          <Badge kind="new">{t("sample.badge.new")}</Badge>
          <Badge kind="top">{t("sample.badge.top")}</Badge>
          <Badge kind="premium">{t("sample.badge.premium")}</Badge>
          <Badge kind="openWeights" href="https://huggingface.co/">
            {t("sample.badge.openWeights")}
          </Badge>
        </div>
      ),
    },
  ],
}

const separator: GalleryEntry = {
  id: "separator",
  title: "entry.separator",
  states: [
    {
      id: "rows",
      label: "state.rows",
      render: () => <Rows keys={rowKeys.slice(0, 3)} />,
    },
  ],
}

const scrollArea: GalleryEntry = {
  id: "scroll-area",
  title: "entry.scrollArea",
  states: [
    {
      id: "overflow",
      label: "state.overflow",
      render: () => (
        <ScrollArea className="h-[calc(4*var(--spacing-s12))] max-w-field-max rounded-card bg-surface px-s4">
          <Rows keys={rowKeys} />
        </ScrollArea>
      ),
    },
  ],
}

const kbd: GalleryEntry = {
  id: "kbd",
  title: "entry.kbd",
  states: [
    {
      id: "keys",
      label: "state.keys",
      render: () => (
        <div className="flex items-center gap-s4">
          <Kbd>{t("sample.key.enter")}</Kbd>
          <KbdGroup>
            <Kbd>{t("sample.key.shift")}</Kbd>
            <Kbd>{t("sample.key.enter")}</Kbd>
          </KbdGroup>
          <KbdGroup>
            <Kbd>{t("sample.key.cmd")}</Kbd>
            <Kbd>{t("sample.key.k")}</Kbd>
          </KbdGroup>
        </div>
      ),
    },
  ],
}

export const displayEntries: GalleryEntry[] = [
  tabs,
  card,
  skeleton,
  progress,
  avatar,
  badge,
  separator,
  scrollArea,
  kbd,
]
