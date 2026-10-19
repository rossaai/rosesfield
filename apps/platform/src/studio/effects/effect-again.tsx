import type { Run } from "@rosesfield/contract"
import { Button } from "@rosesfield/ui/components/button"
import { ImagePlusIcon, RepeatIcon } from "lucide-react"
import type { ReactElement } from "react"
import { tCatalog } from "@/copy/t"

type EffectAgainProps = {
  run: Run
  onAnotherPhoto: (run: Run) => void
  onAnotherEffect: (run: Run) => void
}

export function EffectAgain(props: EffectAgainProps): ReactElement | null {
  if (props.run.status !== "done") {
    return null
  }
  return (
    <div className="flex flex-wrap gap-s2">
      <Button
        tone="default"
        size="dense"
        onClick={() => props.onAnotherPhoto(props.run)}
      >
        <ImagePlusIcon aria-hidden="true" />
        {tCatalog("effects.again.photo")}
      </Button>
      <Button
        tone="default"
        size="dense"
        onClick={() => props.onAnotherEffect(props.run)}
      >
        <RepeatIcon aria-hidden="true" />
        {tCatalog("effects.again.effect")}
      </Button>
    </div>
  )
}
