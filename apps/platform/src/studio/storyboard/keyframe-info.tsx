import type { KeyframeFacts } from "@rosesfield/catalog/storyboard"
import type { ReactElement, ReactNode } from "react"
import { tCatalog } from "@/copy/t"
import { CharacterName } from "@/pieces/run/run-inputs"
import { Detail } from "@/viewer/result-panel"

function keyframeLabel(keyframe: KeyframeFacts): string {
  return tCatalog("storyboard.keyframe.number", { number: keyframe.number })
}

function AnchorValue({ keyframe }: { keyframe: KeyframeFacts }): ReactNode {
  const { anchor } = keyframe
  switch (anchor.kind) {
    case "keyframe":
      return tCatalog(anchor.labelKey)
    case "character":
      return <CharacterName characterId={anchor.characterId} />
    case "reference":
      return tCatalog("storyboard.input.reference.label")
    case "scene":
      return null
  }
}

export function KeyframeAnchorDetail({
  keyframe,
}: {
  keyframe: KeyframeFacts
}): ReactNode {
  if (keyframe.anchor.kind === "scene") {
    return null
  }
  return (
    <Detail label={keyframeLabel(keyframe)}>
      <AnchorValue keyframe={keyframe} />
    </Detail>
  )
}

export function KeyframePrompts({
  keyframes,
}: {
  keyframes: readonly KeyframeFacts[]
}): ReactElement {
  return (
    <dl data-slot="keyframe-prompts" className="flex flex-col gap-s3">
      {keyframes.map((keyframe) => (
        <div key={keyframe.number} className="flex flex-col gap-s1">
          <dt className="text-label text-ink-muted">
            {keyframeLabel(keyframe)}
          </dt>
          <dd className="whitespace-pre-wrap text-body">{keyframe.prompt}</dd>
        </div>
      ))}
    </dl>
  )
}
