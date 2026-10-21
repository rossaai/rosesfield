import {
  AcceptProposalHandler,
  type AgentHarness,
  ChooseAgentModelHandler,
  DeleteConversationHandler,
  ListAgentModelsHandler,
  ListConversationsHandler,
  ReadConversationHandler,
  SendMessageHandler,
  SkipProposalHandler,
  StartConversationHandler,
  UpdateConversationHandler,
} from "@rosesfield/agent"
import type { StartRunHandler } from "@rosesfield/generation"

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
}

export function agentRouteHandlers(
  options: AgentRouteHandlersOptions
): AgentRouteHandlers {
  const { agent, startRun } = options
  return {
    startConversation: new StartConversationHandler({ agent }),
    listConversations: new ListConversationsHandler({ agent }),
    readConversation: new ReadConversationHandler({ agent }),
    updateConversation: new UpdateConversationHandler({ agent }),
    deleteConversation: new DeleteConversationHandler({ agent }),
    sendMessage: new SendMessageHandler({
      agent: options.canAnswer ? agent : null,
    }),
    acceptProposal: new AcceptProposalHandler({ agent, startRun }),
    skipProposal: new SkipProposalHandler({ agent }),
    listModels: new ListAgentModelsHandler({ agent }),
    chooseModel: new ChooseAgentModelHandler({ agent }),
  }
}
