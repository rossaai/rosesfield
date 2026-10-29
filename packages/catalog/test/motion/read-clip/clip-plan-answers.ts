export const planUrl =
  "https://api.comfy.org/v2/models/openrouter/chat-completions"

/** The headers of a Router chat answer captured on 2026-10-21, the credits set to this plan's size. */
const capturedHeaders = {
  "content-type": "application/json",
  "x-comfy-credits-used": "0.09",
  "x-comfy-router-provider": "openrouter",
}

export const twoTargetPlan = {
  targets: [
    {
      find: "the man in the grey coat",
      becomes: "the man of photo 1, with his face, curls and glasses",
      photos: [1],
    },
    {
      find: "the bottle in his right hand",
      becomes: "the amber bottle with a gold cap of photo 3",
      photos: [3],
    },
  ],
  editPrompt:
    "Keep image 1's framing, camera, light and pose. Make the man in the grey coat the man of image 2, with his face, curls and glasses, and make the bottle in his right hand the amber bottle of image 3.",
  scene:
    "A man with short dark curls and round glasses walks down a wet street at night holding an amber bottle in his right hand, his coat swinging with his arms. The camera tracks backward ahead of him. Rain patters and his steps splash.",
}

export const noTargetPlan = {
  targets: [],
  editPrompt: "",
  scene: "",
}

/** A Router chat answer in the shape the captured one has, holding the given content. */
export function chatAnswerOf(content: string): Record<string, unknown> {
  return {
    id: "gen-1792618013-rosesfield-plan",
    object: "chat.completion",
    created: 1_792_618_013,
    model: "z-ai/glm-5.3-flash",
    choices: [
      {
        index: 0,
        logprobs: null,
        finish_reason: "stop",
        native_finish_reason: "stop",
        message: { role: "assistant", content },
      },
    ],
    usage: { prompt_tokens: 8124, completion_tokens: 212, total_tokens: 8336 },
  }
}

export type PlanReply =
  | { status: number; json: unknown }
  | { failure: "timeout" }

export type SentPlan = { url: string; headers: Headers; body: unknown }

/** Replays the Router's answers in order, with the captured headers, and throws on a request past the last. */
export class PlanReplay {
  readonly sent: SentPlan[] = []
  private readonly pending: PlanReply[]

  constructor(replies: readonly PlanReply[]) {
    this.pending = [...replies]
  }

  readonly fetch = async (
    input: string | URL | Request,
    init?: RequestInit
  ): Promise<Response> => {
    const url = input instanceof Request ? input.url : input.toString()
    const reply = this.pending.shift()
    if (reply === undefined || url !== planUrl || init?.method !== "POST") {
      throw new Error(`No recording for ${init?.method} ${url}`)
    }
    this.sent.push({
      url,
      headers: new Request(url, init).headers,
      body: typeof init.body === "string" ? JSON.parse(init.body) : null,
    })
    if ("failure" in reply) {
      throw new DOMException("The operation timed out.", "TimeoutError")
    }
    return new Response(JSON.stringify(reply.json), {
      status: reply.status,
      headers: reply.status === 200 ? capturedHeaders : {},
    })
  }
}

export function planReply(plan: unknown): PlanReply {
  return { status: 200, json: chatAnswerOf(JSON.stringify(plan)) }
}
