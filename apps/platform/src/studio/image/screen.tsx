import { PromptBar } from "@rosesfield/ui/components/prompt-bar"
import { type ReactElement, useState } from "react"
import { promptInputOf } from "@/catalog/app-facts"
import { t } from "@/copy/t"
import { aspectField, countField } from "@/screens/app/app-form"
import { SettingChip } from "@/screens/app/bar/setting-chip"
import { BarChips, BarFrame } from "@/screens/app/bar-frame"
import { textOf } from "@/screens/app/fields/field-props"
import { inputPlaceholder } from "@/screens/app/fields/input-copy"
import { StartProblem } from "@/screens/app/generate-foot"
import type { StudioScreenProps } from "@/screens/app/studio-screens"
import { useAppScreen } from "@/screens/app/use-app-screen"
import {
  ImageModelChip,
  ImageModelSettings,
  useInputRules,
} from "@/studio/image/image-model-settings"

const chips: readonly string[] = [aspectField, countField]

export function AppScreen({ app, seeds }: StudioScreenProps): ReactElement {
  const state = useAppScreen(app, seeds)
  const sheet = useState(false)
  const prompt = promptInputOf(app)
  useInputRules(app, state.form)
  return (
    <BarFrame
      app={app}
      hasRuns={state.hasRuns}
      onUseInputs={state.useInputs}
      sheet={sheet}
      price={state.start.price}
      settings={<ImageModelSettings app={app} state={state} chips={[]} />}
      bar={
        <>
          <StartProblem start={state.start} />
          <PromptBar
            value={
              prompt === null
                ? ""
                : textOf(state.form.values.inputs[prompt.name])
            }
            onValueChange={(value) => {
              if (prompt !== null) {
                state.form.setInput(prompt.name, value)
              }
            }}
            onSubmit={state.start.generate}
            label={t("home.prompt.label")}
            placeholder={
              prompt === null ? "" : (inputPlaceholder(app, prompt) ?? "")
            }
            submitLabel={t("run.generate")}
            removeLabel={t("bar.attachment.remove")}
            chips={
              <BarChips
                chips={
                  <>
                    <ImageModelChip app={app} state={state} chips={chips} />
                    {chips.map((name) => (
                      <SettingChip
                        key={name}
                        app={app}
                        form={state.form}
                        name={name}
                      />
                    ))}
                  </>
                }
                onOpenSheet={() => sheet[1](true)}
              />
            }
            price={state.start.price}
            busy={state.start.isPending}
          />
        </>
      }
    />
  )
}
