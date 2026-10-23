import type { SceneId } from "./demo-manifest"

export type CaptionFacts = {
  appName: string
  isLive: boolean
  runCredits: number | null
  balance: number | null
  liveRuns: number
  liveCredits: number
  proofRuns: number
  proofCredits: number
  graph: string
}

const amount = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 })

function creditsText(value: number): string {
  return `${amount.format(value)} ${value === 1 ? "credit" : "credits"}`
}

export function hookCaption(appName: string): string {
  return `Your photo, then the video one ${appName} run made from it.`
}

function spentCaption(facts: CaptionFacts): string {
  const cost =
    facts.runCredits === null
      ? "Each run shows its price before you start it."
      : `This run cost ${creditsText(facts.runCredits)}.`
  return facts.balance === null
    ? cost
    : `${cost} ${creditsText(facts.balance)} are left on the Comfy account.`
}

function proofCaption(facts: CaptionFacts): string {
  const proof = `${facts.appName} was proven in ${facts.proofRuns} runs for ${creditsText(facts.proofCredits)}.`
  const live =
    facts.liveRuns === 0
      ? "This video started no new run. Each result in it is a stored run."
      : `The ${facts.liveRuns} live ${facts.liveRuns === 1 ? "run" : "runs"} in this video cost ${creditsText(facts.liveCredits)}.`
  return `${proof} ${live}`
}

export function sceneCaption(id: SceneId, facts: CaptionFacts): string {
  switch (id) {
    case "key":
      return "Paste your Comfy key. Every app runs on your own credits."
    case "areas":
      return "Each area holds its apps. They share one library and one history."
    case "models":
      return "Each app lists its models with the price of one run."
    case "run":
      return facts.isLive
        ? "A new run arrives with its model, its seed and its price."
        : "A finished run keeps its model, its seed and its price."
    case "share":
      return "Share makes a public link to the result."
    case "credits":
      return spentCaption(facts)
    case "router":
      return "Hosted models run on the Comfy Router, on your own key."
    case "cloud":
      return "The open graphs run on Comfy Cloud, billed by the second of GPU time."
    case "catalog":
      return "Each model list is read from the catalog Comfy publishes."
    case "graph":
      return `${facts.appName} runs one LTX 2.5 graph, ${facts.graph}, on Comfy Cloud.`
    case "proof":
      return proofCaption(facts)
  }
}

export function clipCaption(
  appName: string,
  facts: { model: string | null; credits: number | null }
): string {
  const parts = [
    `${appName} on Rosesfield`,
    ...(facts.model === null ? [] : [facts.model]),
    ...(facts.credits === null ? [] : [creditsText(facts.credits)]),
  ]
  return parts.join(", ")
}

export function linkCaption(shareUrl: string): string {
  return `Made on Rosesfield.\n${shareUrl}`
}
