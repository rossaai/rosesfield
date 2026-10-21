import {
  fauxAssistantMessage,
  fauxToolCall,
  getCurrentTools,
} from "@earendil-works/pi-ai"
import { type AppDefinition, appDefinition } from "@rosesfield/contract"
import { type ModelForm, taskBinding } from "@rosesfield/generation/bindings"
import { afterEach, describe, expect, it } from "vitest"
import { appTool } from "#infrastructure/pi-app-tool"
import {
  type AgentRig,
  agentFor,
  generationFor,
  lastMessageOf,
  lastToolResultOf,
  readAll,
} from "../harness"

const model = "maker/clip-1"

const clipForm: ModelForm = {
  model,
  fields: [
    {
      kind: "prompt",
      name: "prompt",
      path: "prompt",
      required: true,
      maxLength: null,
      default: null,
    },
    {
      kind: "choice",
      name: "resolution",
      path: "resolution",
      required: false,
      options: ["480P", "768P"],
      default: "768P",
    },
  ],
}

function clipApp(): AppDefinition {
  return appDefinition.parse({
    id: "clips",
    nameKey: "name",
    category: "video",
    inputs: [
      {
        type: "prompt",
        name: "prompt",
        labelKey: "inputs.prompt",
        presence: "required",
        maxLength: 100,
      },
      {
        type: "number",
        name: "length",
        labelKey: "inputs.length",
        min: 2,
        max: 5,
        step: 1,
        default: 5,
      },
    ],
    output: {
      kind: "video",
      count: { default: 1, max: 1 },
      aspectRatios: { options: ["16:9"], default: "16:9" },
    },
    engine: taskBinding({
      tasks: ["text-to-video"],
      input: "model",
      default: model,
      fallback: { adapter: "demo", config: {} },
    }),
    limits: { timeoutSeconds: 60, maxRetries: 0 },
  })
}

let rig: AgentRig | null = null

afterEach(async () => {
  await rig?.close()
  rig = null
})

function rigWith(forms: readonly ModelForm[]): {
  rig: AgentRig
  runs: () => number
} {
  const generation = generationFor([clipApp()])
  rig = agentFor([appTool(clipApp(), () => generation.startRun, forms)])
  return { rig, runs: () => generation.runs.count }
}

describe("an app tool on the published form of its app", () => {
  it("offers the fields of the app's default model, not the app's own inputs", () => {
    const { startRun } = generationFor([])
    const tool = appTool(clipApp(), () => startRun, [clipForm])
    const parameters = JSON.stringify(tool.parameters)

    expect(parameters).toContain('"resolution"')
    expect(parameters).toContain('"768P"')
    expect(parameters).not.toContain('"length"')
  })

  it("refuses a field the default model does not take, and starts no run", async () => {
    const { rig: opened, runs } = rigWith([clipForm])
    const offered: unknown[] = []
    opened.faux.setResponses([
      (context) => {
        offered.push(...getCurrentTools(context.messages))
        return fauxAssistantMessage(
          [fauxToolCall("clips", { inputs: { prompt: "orbit", length: 5 } })],
          { stopReason: "toolUse" }
        )
      },
      (context) =>
        fauxAssistantMessage(
          lastToolResultOf(context)?.isError ? "refused" : "proposed"
        ),
    ])
    const { id } = await opened.agent.startConversation({ runApproval: "ask" })

    const events = await readAll(
      await opened.agent.send({ conversationId: id, text: "A clip of orbit" })
    )

    expect(JSON.stringify(offered)).toContain('"resolution"')
    expect(lastMessageOf(events)).toBe("refused")
    expect(runs()).toBe(0)
  })

  it("proposes the run with the model and the settings it names", async () => {
    const { rig: opened, runs } = rigWith([clipForm])
    opened.faux.setResponses([
      fauxAssistantMessage(
        [
          fauxToolCall("clips", {
            inputs: { prompt: "orbit", resolution: "480P" },
          }),
        ],
        { stopReason: "toolUse" }
      ),
    ])
    const { id } = await opened.agent.startConversation({ runApproval: "ask" })

    const events = await readAll(
      await opened.agent.send({ conversationId: id, text: "A clip of orbit" })
    )

    const proposed = events.find((event) => event.type === "proposal")
    expect(
      proposed?.type === "proposal" ? proposed.proposal.request : null
    ).toEqual({
      inputs: { prompt: "orbit", resolution: "480P", model },
      count: 1,
      aspectRatio: null,
    })
    expect(runs()).toBe(0)
  })
})
