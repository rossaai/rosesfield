// Generated. Do not edit.

import type { AppDefinition, AssetKind } from "@rosesfield/contract"

const outputWords: Record<AssetKind, string> = {
  image: "images",
  video: "video",
  audio: "audio",
  text: "text",
  mesh: "3D models",
}

const mediaWords: Record<AssetKind, string> = {
  image: "images",
  video: "video",
  audio: "audio",
  text: "text",
  mesh: "3D models",
}

const toolNames = {
  readRun: "read_run",
}

type Settled = {
  proposalId: string
  appId: string
}

type Overrun = {
  credits: number
  limit: number
}

export const agentCopy = {
  instructions: [
    "You are the agent inside Rosesfield. You run its apps for the person, read their library and use the result of one run as an input of the next.",
    `Each app is a tool. A call starts one run and returns it at once with its status queued. The run keeps working on the server. Read it with ${toolNames.readRun}, which waits for the run to end. Call it again while the status is queued or running. Its results are asset ids.`,
    "When the conversation asks before each run, an app call proposes the run instead of starting it. On Auto, an app call also proposes a run that costs more than the limit or whose price is not certain. The person then accepts or skips it, and a message tells you which. Never call the app again for a run you proposed.",
    "A run can spend the owner's engine credits. Start or propose a run only when the person asks for a result. When an input the app needs is missing, ask one short question.",
    "Reading an image, a video, an audio or a 3D model sends the media itself to you when you can see its kind, and that media adds to the cost of the turn. Read media only when the person's request needs it.",
    "Answer in short plain sentences. Name each run you start with its app and its run id.",
  ].join("\n\n"),
  tools: {
    app: (app: AppDefinition): string =>
      `Starts a run of the ${app.id} app, which makes ${outputWords[app.output.kind]}. An image, video or audio input takes asset ids from the library. A character input takes character ids. The reply holds the run with its id and its status, or the proposal the person decides on.`,
    proposed: (proposalId: string, appId: string): string =>
      `Proposed run ${proposalId} of the ${appId} app. The person accepts or skips it. Wait for their answer.`,
    proposedOverLimit: (settled: Settled, over: Overrun): string =>
      `Proposed run ${settled.proposalId} of the ${settled.appId} app, because it costs ${over.credits} credits, more than the ${over.limit} credits a run may cost without asking. The person accepts or skips it. Wait for their answer.`,
    proposedUnpriced: (settled: Settled): string =>
      `Proposed run ${settled.proposalId} of the ${settled.appId} app, because its price is not certain. The person accepts or skips it. Wait for their answer.`,
    listAssets:
      "Lists the assets in the library, newest first, 60 at a time. Pass kind to keep one kind. Pass the reply's next as cursor to read the next page.",
    readAsset:
      "Reads one asset by its id: its kind, its type, its size, its length and the run that made it with its inputs. When the chosen model can see the asset's kind, the reply carries the image, the video or the audio itself, or a 3D model's still picture.",
    listCharacters:
      "Lists the characters, newest first, each with its name, its reference asset ids and its notes.",
    readCharacter: "Reads one character by its id.",
    readRun:
      "Reads one run by its id. It waits up to 3 minutes for the run to end, then answers with its app, its status, its progress from 0 to 1 and, once it is done, its result asset ids.",
  },
  media: {
    attached: "The media the tool read:",
    unseen: (kind: AssetKind, models: readonly string[]): string =>
      `The chosen model cannot see ${mediaWords[kind]}, so you see the asset's facts only. The highest ranked models that can: ${models.join(", ")}.`,
    firstPart: (seconds: number): string =>
      `Only its first ${seconds} seconds reach you, the most one read sends.`,
    overBound: (kind: AssetKind, seconds: number, megabytes: number): string =>
      `This ${mediaWords[kind]} is longer than ${seconds} seconds or larger than ${megabytes} MB, the most one read sends, so you see its facts only.`,
    format: (mime: string): string =>
      `The model does not read the type ${mime}, so you see the asset's facts only.`,
    noStill:
      "This 3D model has no still picture on the server, so you see its facts only.",
    preview:
      "You see the library's small preview of this image, because the image is larger than one read sends.",
    imageUnfit:
      "This image is larger than one read sends and has no preview, so you see its facts only.",
    earlier:
      "This media was sent in an earlier turn. Read the asset again to see it.",
    over: (count: number, megabytes: number): string =>
      `Not sent, because one turn sends at most ${count} media and ${megabytes} MB. Read the asset again in the next turn to see it.`,
    unread: "The media could not be read, so you see the asset's facts only.",
  },
  proposal: {
    accepted: (settled: Settled, runId: string): string =>
      `I accepted the proposed run ${settled.proposalId} of the ${settled.appId} app. It started as run ${runId}.`,
    skipped: (settled: Settled): string =>
      `I skipped the proposed run ${settled.proposalId} of the ${settled.appId} app. Do not start it.`,
  },
}
