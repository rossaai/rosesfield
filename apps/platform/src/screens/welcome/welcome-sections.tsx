import type { MediaAspect } from "@rosesfield/ui/components/media-tile"
import { PreviewSlot } from "@rosesfield/ui/components/preview-slot"
import { cn } from "@rosesfield/ui/lib/cn"
import type { ReactElement, ReactNode } from "react"
import { t } from "@/copy/t"
import type { CopyKey } from "@/copy.en"

export type SectionSpec = {
  id: string
  title: CopyKey
  subtitle: CopyKey
  body: readonly CopyKey[]
  media?: { label: CopyKey; aspect: MediaAspect }
}

const wide: MediaAspect = { width: 16, height: 10 }

export const sections = {
  hero: {
    id: "hero",
    title: "welcome.hero.title",
    subtitle: "welcome.hero.subtitle",
    body: [],
    media: { label: "welcome.hero.media.1.label", aspect: wide },
  },
  apps: {
    id: "apps",
    title: "welcome.apps.title",
    subtitle: "welcome.apps.subtitle",
    body: [],
  },
  library: {
    id: "library",
    title: "welcome.library.title",
    subtitle: "welcome.library.subtitle",
    body: [
      "welcome.library.body.1",
      "welcome.library.body.2",
      "welcome.library.body.3",
    ],
    media: { label: "welcome.library.media.1.label", aspect: wide },
  },
  agent: {
    id: "agent",
    title: "welcome.agent.title",
    subtitle: "welcome.agent.subtitle",
    body: ["welcome.agent.body.1", "welcome.agent.body.2"],
    media: { label: "welcome.agent.media.1.label", aspect: wide },
  },
  connect: {
    id: "connect",
    title: "welcome.connect.title",
    subtitle: "welcome.connect.subtitle",
    body: [
      "welcome.connect.body.1",
      "welcome.connect.body.2",
      "welcome.connect.body.3",
    ],
  },
  terms: {
    id: "terms",
    title: "welcome.terms.title",
    subtitle: "welcome.terms.subtitle",
    body: [
      "welcome.terms.body.1",
      "welcome.terms.body.2",
      "welcome.terms.body.3",
    ],
  },
  built: {
    id: "built",
    title: "welcome.built.title",
    subtitle: "welcome.built.subtitle",
    body: [
      "welcome.built.body.1",
      "welcome.built.body.2",
      "welcome.built.body.3",
    ],
  },
  models: {
    id: "models",
    title: "welcome.models.title",
    subtitle: "welcome.models.subtitle",
    body: ["welcome.models.body.1", "welcome.models.body.2"],
  },
  questions: {
    id: "questions",
    title: "welcome.questions.title",
    subtitle: "welcome.questions.title",
    body: [],
  },
} satisfies Readonly<Record<string, SectionSpec>>

type WelcomeSectionProps = {
  spec: SectionSpec
  isDisplay?: boolean
  isMediaFirst?: boolean
  showSubtitle?: boolean
  children?: ReactNode
  wide?: ReactNode
}

export function WelcomeSection({
  spec,
  isDisplay = false,
  isMediaFirst = false,
  showSubtitle = true,
  children,
  wide,
}: WelcomeSectionProps): ReactElement {
  return (
    <section
      id={spec.id}
      className={cn(
        "flex scroll-mt-[var(--spacing-header)] flex-col gap-s6",
        spec.media === undefined
          ? ""
          : "@regular:grid @regular:grid-cols-2 @regular:items-center"
      )}
    >
      <div className="flex max-w-prose-max flex-col gap-s3">
        <h2 className={isDisplay ? "text-display" : "text-title"}>
          {t(spec.title)}
        </h2>
        {showSubtitle ? (
          <p className="text-body text-ink-muted">{t(spec.subtitle)}</p>
        ) : null}
        {spec.body.map((key) => (
          <p key={key} className="text-body">
            {t(key)}
          </p>
        ))}
        {children}
      </div>
      {spec.media === undefined ? null : (
        <div className={isMediaFirst ? "@regular:order-first" : ""}>
          <PreviewSlot
            aspect={spec.media.aspect}
            label={t("previewSlot.label")}
          />
        </div>
      )}
      {wide}
    </section>
  )
}
