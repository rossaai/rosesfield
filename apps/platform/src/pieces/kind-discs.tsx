import type { AppListing } from "@rosesfield/contract"
import { cn } from "@rosesfield/ui/lib/cn"
import {
  ArrowRightIcon,
  FileAudioIcon,
  FileTextIcon,
  ImageIcon,
  TypeIcon,
  UserRoundIcon,
  VideoIcon,
} from "lucide-react"
import type { ReactElement } from "react"
import {
  type OutputKind,
  type TakenKind,
  takenKindsOf,
} from "@/catalog/app-facts"
import { outputKindsOf } from "@/catalog/app-workflows"

type DiscKind = TakenKind | OutputKind

const kindGlyphs = {
  prompt: TypeIcon,
  character: UserRoundIcon,
  image: ImageIcon,
  video: VideoIcon,
  audio: FileAudioIcon,
  text: FileTextIcon,
} satisfies Record<DiscKind, typeof ImageIcon>

export function KindDisc({
  kind,
  isMade,
}: {
  kind: DiscKind
  isMade: boolean
}): ReactElement {
  const Glyph = kindGlyphs[kind]
  return (
    <span
      data-kind={kind}
      data-made={isMade ? "yes" : "no"}
      className={cn(
        "flex size-10 items-center justify-center rounded-full [&_svg]:glyph",
        isMade ? "bg-ink text-canvas" : "bg-(--ground) text-ink-muted"
      )}
    >
      <Glyph />
    </span>
  )
}

export function TakenDiscs({ app }: { app: AppListing }): ReactElement {
  return (
    <span className="flex -space-x-2">
      {takenKindsOf(app).map((kind) => (
        <KindDisc key={kind} kind={kind} isMade={false} />
      ))}
    </span>
  )
}

export function MadeDiscs({ app }: { app: AppListing }): ReactElement {
  return (
    <span className="flex -space-x-2">
      {outputKindsOf(app).map((kind) => (
        <KindDisc key={kind} kind={kind} isMade={true} />
      ))}
    </span>
  )
}

export function KindFlow({ app }: { app: AppListing }): ReactElement {
  return (
    <>
      {takenKindsOf(app).length === 0 ? null : (
        <>
          <TakenDiscs app={app} />
          <ArrowRightIcon className="glyph-small" />
        </>
      )}
      <MadeDiscs app={app} />
    </>
  )
}
