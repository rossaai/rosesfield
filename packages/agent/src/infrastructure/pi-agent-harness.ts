import {
  ConversationBusy,
  createRegistry,
  defineExtension,
  type Extension,
  Harness,
  type HarnessSettings,
  type ModelRef,
  type Conversation as PiConversation,
  type Registry,
  type Storage,
  section,
  type ToolRegistration,
  watchEvents,
} from "@earendil-works/pi-durable"
import type { Models } from "@earendil-works/pi-ai"
import type { Clock } from "@rosesfield/kernel"
import type { Conversation, Proposal, Transcript } from "#agent.contract"
import { agentCopy } from "#copy.en"
import {
  AgentHarness,
  type AgentMessage,
  type AgentModelChoice,
  type AnswerStream,
  type ConversationChanges,
  type NewConversation,
  type ProposalDecision,
  type ProposalRef,
  type StoredProposal,
} from "#domain/agent-harness.port"
import {
  type ConversationId,
  conversationIdFormat,
} from "#domain/conversation.id"
import { AgentModelUnknownError } from "#domain/error/agent-model-unknown.error"
import { ConversationBusyError } from "#domain/error/conversation-busy.error"
import { ConversationNotFoundError } from "#domain/error/conversation-not-found.error"
import { ProposalNotFoundError } from "#domain/error/proposal-not-found.error"
import type { AgentToolSet } from "#infrastructure/pi-agent-tools"
import { PiAnswerStream } from "#infrastructure/pi-answer-stream"
import { proposalOf } from "#infrastructure/pi-app-tool"
import { backgroundContext } from "#infrastructure/pi-context"
import {
  agentSettings,
  conversationList,
  conversationSettings,
  type ListedConversation,
  proposalRecords,
} from "#infrastructure/pi-conversation-docs"
import type { PiModels } from "#infrastructure/pi-models"
import { transcriptOf } from "#infrastructure/pi-transcript"

export type AgentToolSource =
  | readonly ToolRegistration[]
  | (() => Promise<AgentToolSet>)

export type PiAgentHarnessOptions = {
  models: () => Promise<PiModels>
  storage: () => Promise<Storage>
  tools: AgentToolSource
  clock: Clock
  settings?: HarnessSettings
}

type Opened = {
  harness: Harness
  model: ModelRef
  models: Models
  registry: Registry
  tools: { complete: boolean }
}

type Found = {
  harness: Harness
  model: ModelRef
  listed: ListedConversation
  conversation: PiConversation
}

const context = backgroundContext
const decisionKind = "rosesfield.proposal-decision"

export class PiAgentHarness extends AgentHarness {
  static readonly titleMaxLength = 80
  static readonly settings: HarnessSettings = {
    stream: { timeoutMs: 120_000, maxRetries: 2 },
    retry: { maxRetries: 2 },
  }

  private readonly models: () => Promise<PiModels>
  private readonly storage: () => Promise<Storage>
  private readonly tools: () => Promise<AgentToolSet>
  private readonly clock: Clock
  private readonly settings: HarnessSettings
  private opening: Promise<Opened> | null = null
  private rereading: Promise<void> | null = null

  constructor(options: PiAgentHarnessOptions) {
    super()
    this.models = options.models
    this.storage = options.storage
    this.tools = toolSourceOf(options.tools)
    this.clock = options.clock
    this.settings = options.settings ?? PiAgentHarness.settings
  }

  override async startConversation(
    options: NewConversation
  ): Promise<Conversation> {
    const { harness, model } = await this.open()
    const id = conversationIdFormat.parse(crypto.randomUUID())
    const createdAt = this.clock.now().toISOString()
    await harness.createConversation(
      {
        ownership: { kind: "ownerless" },
        agent: { model },
        init: async (tx, conversation) => {
          const list = await tx.doc(conversationList)
          list.items[id] = { conversation, title: null, createdAt }
          const settings = await tx.doc(conversationSettings, conversation)
          settings.runApproval = options.runApproval
        },
      },
      context
    )
    return { id, title: null, runApproval: options.runApproval, createdAt }
  }

  override async listConversations(): Promise<Conversation[]> {
    const { harness } = await this.open()
    const list = await harness.snapshot(conversationList, context)
    const listed = Object.entries(list?.items ?? {})
    const conversations = await Promise.all(
      listed.map(([id, item]) => conversationOf(harness, id, item))
    )
    return conversations.sort((left, right) =>
      left.createdAt === right.createdAt
        ? right.id.localeCompare(left.id)
        : right.createdAt.localeCompare(left.createdAt)
    )
  }

  override async readConversation(id: ConversationId): Promise<Transcript> {
    const { harness, listed, conversation } = await this.find(id)
    const view = await conversation.context(context)
    const items = await transcriptOf(view.entries, async (shown) => {
      const stored = await harness.snapshot(
        proposalRecords,
        conversation.id,
        shown.id,
        context
      )
      return stored === undefined ? shown : proposalOf(stored)
    })
    return { conversation: await conversationOf(harness, id, listed), items }
  }

  override async updateConversation(
    id: ConversationId,
    changes: ConversationChanges
  ): Promise<Conversation> {
    const { harness, conversation } = await this.find(id)
    await harness.commit(async (tx) => {
      const list = await tx.doc(conversationList)
      const item = list.items[id]
      if (item !== undefined && changes.title !== undefined) {
        item.title = changes.title
      }
      if (changes.runApproval !== undefined) {
        const settings = await tx.doc(conversationSettings, conversation.id)
        settings.runApproval = changes.runApproval
      }
    }, context)
    const { listed } = await this.find(id)
    return conversationOf(harness, id, listed)
  }

  override async deleteConversation(id: ConversationId): Promise<void> {
    const { harness, conversation } = await this.find(id)
    await conversation.abort(context)
    await harness.commit(async (tx) => {
      const list = await tx.doc(conversationList)
      delete list.items[id]
    }, context)
  }

  override async listModels(): Promise<AgentModelChoice> {
    const opened = await this.open()
    return { models: listedOf(opened), model: await chosenOf(opened) }
  }

  override async chooseModel(model: string): Promise<AgentModelChoice> {
    const opened = await this.open()
    if (!listedOf(opened).includes(model)) {
      throw new AgentModelUnknownError({
        provider: opened.model.provider,
        model,
      })
    }
    await opened.harness.commit(async (tx) => {
      const settings = await tx.doc(agentSettings)
      settings.model = model
    }, context)
    return this.listModels()
  }

  override async send(message: AgentMessage): Promise<AnswerStream> {
    const found = await this.find(message.conversationId)
    const { harness, conversation } = found
    const opened = await this.open()
    await this.completeTools(opened)
    await useModel(conversation, {
      provider: found.model.provider,
      modelId: await chosenOf(opened),
    })
    if (found.listed.title === null) {
      await this.title(message)
    }
    const events = await watchEvents(harness, conversation.id, context)
    try {
      const submission = await conversation.submit(
        { type: "input", content: message.text, whenBusy: "reject" },
        context
      )
      return new PiAnswerStream({ events, submission })
    } catch (error) {
      await events.stop()
      if (error instanceof ConversationBusy) {
        throw new ConversationBusyError({
          conversationId: message.conversationId,
        })
      }
      throw error
    }
  }

  override async readProposal(ref: ProposalRef): Promise<StoredProposal> {
    const { harness, conversation } = await this.find(ref.conversationId)
    const stored = await harness.snapshot(
      proposalRecords,
      conversation.id,
      ref.proposalId,
      context
    )
    if (stored === undefined) {
      throw new ProposalNotFoundError({ proposalId: ref.proposalId })
    }
    return { proposal: proposalOf(stored), body: stored.body }
  }

  override async settleProposal(
    ref: ProposalRef,
    decision: ProposalDecision
  ): Promise<Proposal> {
    const { proposal } = await this.readProposal(ref)
    const { conversation } = await this.find(ref.conversationId)
    const runId = decision.status === "accepted" ? decision.runId : null
    await conversation.commit(async (tx) => {
      const draft = await tx.doc(
        proposalRecords,
        conversation.id,
        ref.proposalId,
        { ...proposal, body: {} }
      )
      draft.status = decision.status
      draft.runId = runId
    }, context)
    const settled = { proposalId: proposal.id, appId: proposal.appId }
    const note =
      runId === null
        ? agentCopy.proposal.skipped(settled)
        : agentCopy.proposal.accepted(settled, runId)
    await conversation.submit(
      {
        type: "write",
        entry: {
          kind: decisionKind,
          data: { proposalId: proposal.id, status: decision.status, runId },
          model: [
            {
              role: "user",
              content: note,
              timestamp: this.clock.now().getTime(),
            },
          ],
        },
      },
      context
    )
    return { ...proposal, status: decision.status, runId }
  }

  async close(): Promise<void> {
    const opening = this.opening
    this.opening = null
    const opened = await opening?.catch(() => null)
    await opened?.harness.close(context)
  }

  private async title(message: AgentMessage): Promise<void> {
    const { harness } = await this.open()
    const firstLine = message.text.trim().split("\n")[0] ?? ""
    const title = firstLine.slice(0, PiAgentHarness.titleMaxLength).trim()
    await harness.commit(async (tx) => {
      const item = (await tx.doc(conversationList)).items[
        message.conversationId
      ]
      if (item !== undefined && item.title === null && title !== "") {
        item.title = title
      }
    }, context)
  }

  private open(): Promise<Opened> {
    this.opening ??= this.openHarness().catch((error: unknown) => {
      this.opening = null
      throw error
    })
    return this.opening
  }

  private async openHarness(): Promise<Opened> {
    const { models, ref } = await this.models()
    const read = await this.tools()
    const registry = createRegistry()
    registry.install(extensionOf(read.tools))
    const harness = await Harness.open(
      await this.storage(),
      { models, registry, settings: this.settings },
      context
    )
    harness.resume()
    return {
      harness,
      model: ref,
      models,
      registry,
      tools: { complete: read.complete },
    }
  }

  private async completeTools(opened: Opened): Promise<void> {
    if (opened.tools.complete) {
      return
    }
    this.rereading ??= this.reinstallTools(opened).finally(() => {
      this.rereading = null
    })
    await this.rereading
  }

  private async reinstallTools(opened: Opened): Promise<void> {
    const read = await this.tools()
    opened.registry.install(extensionOf(read.tools))
    opened.tools.complete = read.complete
  }

  private async find(conversationId: ConversationId): Promise<Found> {
    const { harness, model } = await this.open()
    const list = await harness.snapshot(conversationList, context)
    const listed = list?.items[conversationId]
    const conversation =
      listed === undefined
        ? undefined
        : await harness.conversation(listed.conversation, context)
    if (listed === undefined || conversation === undefined) {
      throw new ConversationNotFoundError({ conversationId })
    }
    return { harness, model, listed, conversation }
  }
}

function toolSourceOf(source: AgentToolSource): () => Promise<AgentToolSet> {
  if (typeof source === "function") {
    return source
  }
  const tools = [...source]
  return async () => ({ tools, complete: true })
}

function extensionOf(tools: readonly ToolRegistration[]): Extension {
  return defineExtension({
    name: "rosesfield",
    tools,
    sections: [section("rosesfield", () => agentCopy.instructions)],
  })
}

async function conversationOf(
  harness: Harness,
  id: string,
  listed: ListedConversation
): Promise<Conversation> {
  const settings = await harness.snapshot(
    conversationSettings,
    listed.conversation,
    context
  )
  return {
    id: conversationIdFormat.parse(id),
    title: listed.title,
    runApproval: settings?.runApproval ?? "ask",
    createdAt: listed.createdAt,
  }
}

function listedOf(opened: Opened): string[] {
  return opened.models
    .getModels(opened.model.provider)
    .map((model) => model.id)
}

async function chosenOf(opened: Opened): Promise<string> {
  const settings = await opened.harness.snapshot(agentSettings, context)
  const chosen = settings?.model ?? null
  return chosen !== null && listedOf(opened).includes(chosen)
    ? chosen
    : opened.model.modelId
}

async function useModel(
  conversation: PiConversation,
  model: ModelRef
): Promise<void> {
  const current = (await conversation.agent(context)).model
  if (
    current?.provider !== model.provider ||
    current.modelId !== model.modelId
  ) {
    await conversation.configure({ model }, context)
  }
}
