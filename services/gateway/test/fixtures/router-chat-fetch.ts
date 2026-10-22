import { routerChat } from "@rosesfield/agent"
import { ComfyRouterGenerationEngine, type Fetch } from "@rosesfield/generation"

const chatUrl = `${ComfyRouterGenerationEngine.routerUrl}/v2/models/${routerChat.route}`

export function withRouterChat(comfy: Fetch, chat: Fetch): Fetch {
  return (input, init) => {
    const url = input instanceof Request ? input.url : String(input)
    return url === chatUrl ? chat(input, init) : comfy(input, init)
  }
}
