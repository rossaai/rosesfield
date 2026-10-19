import { Button, IconButton } from "@rosesfield/ui/components/button"
import { FieldNote } from "@rosesfield/ui/components/field"
import { Textarea } from "@rosesfield/ui/components/textarea"
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, XIcon } from "lucide-react"
import { type ReactElement, useEffect, useRef } from "react"
import { t, tCatalog } from "@/copy/t"
import { FieldFrame } from "@/screens/app/fields/field-frame"
import type { StoryboardState } from "@/studio/storyboard/use-storyboard-screen"
import {
  maxScenes,
  sceneInputName,
  sceneMaxLength,
} from "../../../../../packages/catalog/src/storyboard/storyboard-inputs"

type SceneRowProps = {
  index: number
  state: StoryboardState
}

function SceneRow({ index, state }: SceneRowProps): ReactElement {
  const number = index + 1
  const name = sceneInputName(number)
  const field = useRef<HTMLTextAreaElement>(null)
  const { register } = state
  useEffect(() => {
    register(name)(() => field.current?.focus())
  }, [register, name])
  const text = state.scenes[index] ?? ""
  const total = state.scenes.length
  const isNearLimit = text.length > sceneMaxLength * 0.8
  return (
    <li>
      <FieldFrame
        caption={tCatalog("storyboard.scene.number", { number })}
        isOptional={false}
        note={
          isNearLimit
            ? t("field.prompt.count", {
                count: text.length,
                max: sceneMaxLength,
              })
            : null
        }
        problem={undefined}
        message={state.messages.get(name) ?? null}
        captionEnd={
          <span className="flex items-center gap-s1_5">
            <IconButton
              label={tCatalog("storyboard.scene.moveUp", { number })}
              size="small"
              disabled={index === 0}
              onClick={() => state.moveScene(index, -1)}
            >
              <ArrowUpIcon aria-hidden="true" />
            </IconButton>
            <IconButton
              label={tCatalog("storyboard.scene.moveDown", { number })}
              size="small"
              disabled={index === total - 1}
              onClick={() => state.moveScene(index, 1)}
            >
              <ArrowDownIcon aria-hidden="true" />
            </IconButton>
            <IconButton
              label={tCatalog("storyboard.scene.remove", { number })}
              size="small"
              disabled={total === 1}
              onClick={() => state.removeScene(index)}
            >
              <XIcon aria-hidden="true" />
            </IconButton>
          </span>
        }
      >
        <Textarea
          ref={field}
          value={text}
          placeholder={tCatalog("storyboard.input.scenes.placeholder")}
          onChange={(event) => state.setScene(index, event.target.value)}
          className="max-w-none"
        />
      </FieldFrame>
    </li>
  )
}

export function SceneList({ state }: { state: StoryboardState }): ReactElement {
  return (
    <section className="flex flex-col gap-s3">
      <h3 className="text-label font-medium">
        {tCatalog("storyboard.input.scenes.label")}
      </h3>
      <ol className="flex flex-col gap-s3">
        {state.scenes.map((_, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: a scene's place in the list is its number
          <SceneRow key={index} index={index} state={state} />
        ))}
      </ol>
      {state.scenes.length < maxScenes ? (
        <Button className="self-start" onClick={state.addScene}>
          <PlusIcon />
          {tCatalog("storyboard.scene.add")}
        </Button>
      ) : (
        <FieldNote>{tCatalog("storyboard.input.scenes.tooMany")}</FieldNote>
      )}
    </section>
  )
}
