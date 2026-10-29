import {
  AcceptProposalHandler,
  type AgentHarness,
  ChooseAgentModelHandler,
  DeleteConversationHandler,
  ListAgentModelsHandler,
  ListConversationsHandler,
  PiProposalRunner,
  ReadConversationHandler,
  SendMessageHandler,
  SkipProposalHandler,
  StartConversationHandler,
  UpdateConversationHandler,
} from "@rosesfield/agent"
import type { ClipReader } from "@rosesfield/catalog/motion"
import type {
  GetRunHandler,
  PriceRunHandler,
  StartRunHandler,
} from "@rosesfield/generation"
import type {
  GetAssetHandler,
  ReadAssetContentHandler,
} from "@rosesfield/library"

export type AgentRouteHandlers = {
  startConversation: StartConversationHandler
  listConversations: ListConversationsHandler
  readConversation: ReadConversationHandler
  updateConversation: UpdateConversationHandler
  deleteConversation: DeleteConversationHandler
  sendMessage: SendMessageHandler
  acceptProposal: AcceptProposalHandler
  skipProposal: SkipProposalHandler
  listModels: ListAgentModelsHandler
  chooseModel: ChooseAgentModelHandler
}

type AgentRouteHandlersOptions = {
  agent: AgentHarness | null
  canAnswer: boolean
  startRun: StartRunHandler
  getRun: GetRunHandler
  priceRun: PriceRunHandler
  getAsset: GetAssetHandler
  readAssetContent: ReadAssetContentHandler
  clips: ClipReader | null
  pollRun: (runId: string) => Promise<void>
}

export function agentRouteHandlers(
  options: AgentRouteHandlersOptions
): AgentRouteHandlers {
  const { agent, pollRun } = options
  return {
    startConversation: new StartConversationHandler({ agent }),
    listConversations: new ListConversationsHandler({ agent }),
    readConversation: new ReadConversationHandler({ agent }),
    updateConversation: new UpdateConversationHandler({ agent }),
    deleteConversation: new DeleteConversationHandler({ agent }),
    sendMessage: new SendMessageHandler({
      agent: options.canAnswer ? agent : null,
    }),
    acceptProposal: new AcceptProposalHandler({
      agent,
      runner: new PiProposalRunner({
        handlers: {
          startRun: options.startRun,
          getRun: options.getRun,
          priceRun: options.priceRun,
          getAsset: options.getAsset,
          readAssetContent: options.readAssetContent,
          clips: options.clips,
        },
        poll: pollRun,
      }),
    }),
    skipProposal: new SkipProposalHandler({ agent }),
    listModels: new ListAgentModelsHandler({ agent }),
    chooseModel: new ChooseAgentModelHandler({ agent }),
  }
}
