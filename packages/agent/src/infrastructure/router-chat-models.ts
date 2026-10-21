export const routerChat = {
  provider: "comfy-router",
  route: "openrouter/chat-completions",
  timeoutMs: 120_000,
  contextWindow: 65_536,
  maxTokens: 8192,
}

export const defaultChatModel = "deepseek/deepseek-v4-flash"

export const routerChatModels: readonly string[] = [
  defaultChatModel,
  "qwen/qwen3.6-flash",
  "deepseek/deepseek-v3.2",
  "z-ai/glm-4.6",
  "google/gemini-3.5-flash",
  "openai/gpt-5.6-luna",
  "anthropic/claude-haiku-4.5",
  "anthropic/claude-sonnet-5",
]

export function isRouterChatModel(model: string): boolean {
  return routerChatModels.includes(model)
}
