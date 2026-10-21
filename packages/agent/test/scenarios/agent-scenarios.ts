import type { Run as RunRecord } from "@rosesfield/contract"
import { Run } from "@rosesfield/generation"
import { assetIdFormat } from "@rosesfield/kernel"
import type { AnswerEvent, Proposal, RunApproval } from "#agent.contract"
import { openPiModels } from "#infrastructure/pi-models"
import type { RunWait } from "#infrastructure/pi-library-tools"
import type { Fetch } from "#infrastructure/router-chat-fetch"
import {
  routerChat,
  routerChatModels,
} from "#infrastructure/router-chat-models"
import { FakeAssetRepository } from "../fake/fake-asset-repository"
import { FakeCharacterRepository } from "../fake/fake-character-repository"
import {
  agentFor,
  allToolsFor,
  type Generation,
  generationFor,
  readAll,
} from "../harness"
import { imageApp, motionApp, start } from "../sample"

export type ScenarioId = "words" | "propose" | "chain"

export type Seen = {
  events: AnswerEvent[]
  runs: RunRecord[]
}

export type Scenario = {
  id: ScenarioId
  text: string
  runApproval: RunApproval
  problemsOf: (seen: Seen) => string[]
}

export type ScenarioResult = {
  scenario: ScenarioId
  problems: string[]
  credits: number | null
}

export type ModelResults = {
  model: string
  results: readonly ScenarioResult[]
}

export type ScenarioRun = {
  model: string
  key: string
  fetch: Fetch
}

const outputs: readonly string[] = [
  "3a4b5c6d-7e8f-4a0b-9c1d-2e3f4a5b6c7d",
  "4b5c6d7e-8f9a-4b1c-8d2e-3f4a5b6c7d8e",
  "5c6d7e8f-9a0b-4c2d-9e3f-4a5b6c7d8e9f",
]

function messagesOf(events: readonly AnswerEvent[]): string[] {
  return events.flatMap((event) =>
    event.type === "message" ? [event.text] : []
  )
}

function proposalsOf(events: readonly AnswerEvent[]): Proposal[] {
  return events.flatMap((event) =>
    event.type === "proposal" ? [event.proposal] : []
  )
}

function endProblems(events: readonly AnswerEvent[]): string[] {
  const last = events.at(-1)
  return last?.type === "done"
    ? []
    : [`the turn ended with ${JSON.stringify(last ?? null)}, not done`]
}

function wordsProblems(seen: Seen): string[] {
  const problems = endProblems(seen.events)
  if (messagesOf(seen.events).every((text) => text.trim() === "")) {
    problems.push("the agent answered no words")
  }
  if (seen.runs.length > 0 || proposalsOf(seen.events).length > 0) {
    problems.push("the agent started or proposed a run nobody asked for")
  }
  return problems
}

function proposeProblems(seen: Seen): string[] {
  const problems = endProblems(seen.events)
  const proposals = proposalsOf(seen.events)
  const [proposal] = proposals
  if (proposals.length !== 1 || proposal === undefined) {
    return [...problems, `the agent proposed ${proposals.length} runs, not 1`]
  }
  if (proposal.appId !== imageApp().id) {
    problems.push(`the agent proposed ${proposal.appId}, not the image app`)
  }
  const prompt = proposal.request.inputs.prompt
  if (typeof prompt !== "string" || !/rose/i.test(prompt)) {
    problems.push("the proposed prompt does not ask for the rose")
  }
  if (seen.runs.length > 0) {
    problems.push("the agent started a run the person had not accepted")
  }
  return problems
}

function chainProblems(seen: Seen): string[] {
  const problems = endProblems(seen.events)
  const [image, video] = seen.runs
  const apps = seen.runs.map((run) => run.appId)
  if (
    seen.runs.length !== 2 ||
    image?.appId !== imageApp().id ||
    video?.appId !== motionApp().id
  ) {
    return [
      ...problems,
      `the agent ran ${apps.join(", ")}, not image then video`,
    ]
  }
  if (JSON.stringify(video.inputs.image) !== JSON.stringify(image.outputs)) {
    problems.push("the video is not made from the image the first run made")
  }
  if (seen.runs.some((run) => run.status !== "done")) {
    problems.push("a run did not end done")
  }
  return problems
}

export const agentScenarios: readonly Scenario[] = [
  {
    id: "words",
    text: "What can you do here?",
    runApproval: "ask",
    problemsOf: wordsProblems,
  },
  {
    id: "propose",
    text: "Make an image of a red rose in a glass vase.",
    runApproval: "ask",
    problemsOf: proposeProblems,
  },
  {
    id: "chain",
    text: "Make an image of a red rose, then a short video of that image with the rose opening.",
    runApproval: "auto",
    problemsOf: chainProblems,
  },
]

export function scenarioOf(id: string): Scenario {
  const scenario = agentScenarios.find((one) => one.id === id)
  if (scenario === undefined) {
    throw new Error(`No agent scenario is named ${id}`)
  }
  return scenario
}

function finishRuns(generation: Generation): RunWait {
  return async () => {
    const enqueued = generation.jobs.enqueued
    const runs = await Promise.all(
      enqueued.map((runId) => generation.runs.get(runId))
    )
    await Promise.all(
      runs.map((stored, index) => {
        if (stored === null || stored.isFinished()) {
          return null
        }
        const state = stored.toState()
        const output = assetIdFormat.parse(outputs[index] ?? outputs.at(-1))
        return generation.runs.save(
          Run.restore({
            ...state,
            record: {
              ...state.record,
              status: "done",
              outputs: [output],
              finishedAt: start.toISOString(),
            },
          })
        )
      })
    )
  }
}

function creditsOf(events: readonly AnswerEvent[]): number | null {
  const last = events.at(-1)
  return last?.type === "done" ? (last.credits ?? null) : null
}

export async function runScenario(
  scenario: Scenario,
  run: ScenarioRun
): Promise<ScenarioResult> {
  const apps = [imageApp(), motionApp()]
  const generation = generationFor(apps)
  const library = {
    assets: new FakeAssetRepository(),
    characters: new FakeCharacterRepository(),
  }
  const rig = agentFor(
    allToolsFor(apps, generation, library, finishRuns(generation)),
    () =>
      openPiModels(
        { provider: routerChat.provider, model: run.model, apiKey: run.key },
        { fetch: run.fetch }
      )
  )
  try {
    const { id } = await rig.agent.startConversation({
      runApproval: scenario.runApproval,
    })
    const events = await readAll(
      await rig.agent.send({ conversationId: id, text: scenario.text })
    )
    const stored = await Promise.all(
      generation.jobs.enqueued.map((runId) => generation.runs.get(runId))
    )
    const runs = stored.flatMap((one) => (one === null ? [] : [one.toRecord()]))
    return {
      scenario: scenario.id,
      problems: scenario.problemsOf({ events, runs }),
      credits: creditsOf(events),
    }
  } finally {
    await rig.close()
  }
}

function hasPassed(model: ModelResults): boolean {
  return agentScenarios.every((scenario) =>
    model.results.some(
      (result) =>
        result.scenario === scenario.id && result.problems.length === 0
    )
  )
}

function totalCredits(model: ModelResults): number {
  return model.results.reduce((sum, result) => sum + (result.credits ?? 0), 0)
}

export function cheapestPass(models: readonly ModelResults[]): string | null {
  const passed = models
    .filter(hasPassed)
    .sort(
      (left, right) =>
        totalCredits(left) - totalCredits(right) ||
        routerChatModels.indexOf(left.model) -
          routerChatModels.indexOf(right.model)
    )
  return passed[0]?.model ?? null
}
