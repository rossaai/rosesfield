import {
  type QueryClient,
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import {
  acceptProposal,
  type Conversation,
  type ConversationChanges,
  deleteConversation,
  listConversations,
  type Proposal,
  readConversation,
  skipProposal,
  type Transcript,
  updateConversation,
} from "@/api/conversation-wire"
import { noteProposal, setLiveTurn } from "@/screens/agent/conversation-store"

export const conversationsQuery = queryOptions({
  queryKey: ["conversations"],
  queryFn: ({ signal }) => listConversations(signal),
})

export function transcriptKey(conversationId: string): readonly string[] {
  return ["conversation", conversationId]
}

export function transcriptQuery(conversationId: string) {
  return queryOptions({
    queryKey: transcriptKey(conversationId),
    queryFn: ({ signal }) => readConversation(conversationId, signal),
  })
}

export function newestFirst(list: readonly Conversation[]): Conversation[] {
  return [...list].sort((one, two) =>
    two.createdAt.localeCompare(one.createdAt)
  )
}

function keepConversation(client: QueryClient, next: Conversation): void {
  client.setQueryData<Transcript>(transcriptKey(next.id), (current) =>
    current === undefined ? current : { ...current, conversation: next }
  )
  client.setQueryData<Conversation[]>(conversationsQuery.queryKey, (list) =>
    list?.map((one) => (one.id === next.id ? next : one))
  )
}

export function useUpdateConversation(conversationId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (changes: ConversationChanges) =>
      updateConversation(conversationId, changes),
    onSuccess: (next) => keepConversation(client, next),
  })
}

export function useDeleteConversation(conversationId: string) {
  const client = useQueryClient()
  const navigate = useNavigate()
  return useMutation({
    mutationFn: () => deleteConversation(conversationId),
    onSuccess: async () => {
      setLiveTurn(conversationId, null)
      client.setQueryData<Conversation[]>(conversationsQuery.queryKey, (list) =>
        list?.filter((one) => one.id !== conversationId)
      )
      await navigate({ to: "/agent" })
      client.removeQueries({ queryKey: transcriptKey(conversationId) })
    },
  })
}

function keepProposal(
  client: QueryClient,
  conversationId: string,
  proposal: Proposal
): void {
  noteProposal(conversationId, proposal)
  client.setQueryData<Transcript>(transcriptKey(conversationId), (current) =>
    current === undefined
      ? current
      : {
          ...current,
          items: current.items.map((item) =>
            item.type === "proposal" && item.proposal.id === proposal.id
              ? { type: "proposal", proposal }
              : item
          ),
        }
  )
}

export function useProposalActs(conversationId: string, proposalId: string) {
  const client = useQueryClient()
  const generate = useMutation({
    mutationFn: () => acceptProposal(conversationId, proposalId),
    onSuccess: ({ proposal, run }) => {
      client.setQueryData(["run", run.id], { run })
      keepProposal(client, conversationId, proposal)
      void client.invalidateQueries({ queryKey: ["runs"] })
    },
  })
  const skip = useMutation({
    mutationFn: () => skipProposal(conversationId, proposalId),
    onSuccess: (proposal) => keepProposal(client, conversationId, proposal),
  })
  return { generate, skip }
}
