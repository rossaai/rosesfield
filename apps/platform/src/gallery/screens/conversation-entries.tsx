import type {
  Conversation,
  Proposal,
  Transcript,
} from "@/api/conversation-wire"
import { holdVisitorKey } from "@/api/visitor-keys"
import { t } from "@/gallery/copy.en"
import type { GalleryEntry } from "@/gallery/gallery-entry"
import {
  publicSettingsOf,
  type Seed,
  screenRuns,
  seeds,
} from "@/gallery/screens/screen-fixtures"
import { screenEntry } from "@/gallery/screens/screen-frame"
import { setLiveTurn, type Turn } from "@/screens/agent/conversation-store"

const createdAt = "2026-10-17T09:00:00.000Z"

const ids = {
  done: "5f6a7b8c-9d0e-4f1a-8b2c-4d5e6f7a8b01",
  working: "5f6a7b8c-9d0e-4f1a-8b2c-4d5e6f7a8b02",
  failed: "5f6a7b8c-9d0e-4f1a-8b2c-4d5e6f7a8b03",
  older: "5f6a7b8c-9d0e-4f1a-8b2c-4d5e6f7a8b04",
  proposed: "6a7b8c9d-0e1f-4a2b-9c3d-5e6f7a8b9c01",
  skipped: "6a7b8c9d-0e1f-4a2b-9c3d-5e6f7a8b9c02",
}

function conversationOf(id: string, title: string | null): Conversation {
  return { id, title, runApproval: "ask", createdAt }
}

const conversations: Conversation[] = [
  conversationOf(ids.done, t("sample.agent.title")),
  conversationOf(ids.older, t("sample.agent.olderTitle")),
]

function proposalOf(id: string, status: Proposal["status"]): Proposal {
  return {
    id,
    appId: "image",
    request: {
      inputs: { prompt: t("sample.agent.proposalPrompt") },
      count: 2,
      aspectRatio: "16:9",
    },
    status,
    runIds: [],
    credits: null,
  }
}

const doneTranscript: Transcript = {
  conversation: conversationOf(ids.done, t("sample.agent.title")),
  items: [
    { type: "person", text: t("sample.agent.prompt") },
    { type: "agent", text: t("sample.agent.answer") },
    { type: "run", runId: screenRuns.image.id },
    { type: "person", text: t("sample.agent.second") },
    { type: "agent", text: t("sample.agent.proposalAnswer") },
    { type: "proposal", proposal: proposalOf(ids.proposed, "proposed") },
    { type: "proposal", proposal: proposalOf(ids.skipped, "skipped") },
  ],
}

function emptyTranscript(id: string): Transcript {
  return { conversation: conversationOf(id, null), items: [] }
}

function turnOf(change: Partial<Turn>): Turn {
  return {
    key: "turn-1",
    text: t("sample.agent.prompt"),
    prompt: t("sample.agent.prompt"),
    assetIds: [],
    characterIds: [],
    parts: [],
    status: "answering",
    failureCode: null,
    credits: null,
    shownItems: 0,
    ...change,
  }
}

const withModel: readonly Seed[] = [
  seeds.settings("set"),
  seeds.media(),
  seeds.runs([]),
]

function holdTurn(id: string, turn: Turn | null): () => void {
  return () => setLiveTurn(id, turn)
}

const agentStart = screenEntry("agent", "entry.screen.agent", [
  {
    id: "empty",
    label: "state.empty",
    path: "/agent",
    seeds: [...withModel, seeds.data(["conversations"], [])],
  },
  {
    id: "no-model",
    label: "state.noModel",
    path: "/agent",
    seeds: [seeds.settings("missing"), seeds.runs([])],
  },
  {
    id: "no-key",
    label: "state.noKey",
    path: "/agent",
    seeds: [seeds.settingsAs(publicSettingsOf(false)), seeds.runs([])],
    before: () => holdVisitorKey("engine", null),
  },
  { id: "loading", label: "state.loading", path: "/agent", seeds: withModel },
  {
    id: "done",
    label: "state.done",
    path: "/agent",
    seeds: [...withModel, seeds.data(["conversations"], conversations)],
  },
  {
    id: "failed",
    label: "state.failed",
    path: "/agent",
    seeds: [...withModel, seeds.failed(["conversations"])],
  },
])

const listed = seeds.data(["conversations"], conversations)

const conversation = screenEntry("conversation", "entry.screen.conversation", [
  {
    id: "empty",
    label: "state.empty",
    path: `/agent/${ids.failed}`,
    seeds: [...withModel, listed, seeds.missing(["conversation", ids.failed])],
  },
  {
    id: "loading",
    label: "state.loading",
    path: `/agent/${ids.done}`,
    seeds: [...withModel, listed],
  },
  {
    id: "working",
    label: "state.working",
    path: `/agent/${ids.working}`,
    seeds: [
      ...withModel,
      listed,
      seeds.data(["conversation", ids.working], emptyTranscript(ids.working)),
    ],
    before: holdTurn(
      ids.working,
      turnOf({
        parts: [{ kind: "text", index: 0, text: t("sample.agent.growing") }],
      })
    ),
  },
  {
    id: "done",
    label: "state.done",
    path: `/agent/${ids.done}`,
    seeds: [
      ...withModel,
      listed,
      seeds.data(["conversation", ids.done], doneTranscript),
    ],
    before: holdTurn(ids.done, null),
  },
  {
    id: "failed",
    label: "state.failed",
    path: `/agent/${ids.failed}`,
    seeds: [
      ...withModel,
      listed,
      seeds.data(["conversation", ids.failed], emptyTranscript(ids.failed)),
    ],
    before: holdTurn(
      ids.failed,
      turnOf({ status: "failed", failureCode: "AGENT_ANSWER_FAILED" })
    ),
  },
  {
    id: "load-failed",
    label: "state.loadFailed",
    path: `/agent/${ids.done}`,
    seeds: [...withModel, listed, seeds.failed(["conversation", ids.done])],
  },
])

export const conversationEntries: GalleryEntry[] = [agentStart, conversation]
