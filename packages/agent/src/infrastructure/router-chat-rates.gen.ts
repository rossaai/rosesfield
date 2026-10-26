// Written by packages/agent/scripts/router-chat-rates-sync.ts from the prices OpenRouter publishes. Do not edit.

export const routerChatRates = {
  "source": "https://openrouter.ai/api/v1/models",
  "readOn": "2026-10-26",
  "unit": "USD per 1M tokens",
  "models": {
    "deepseek/deepseek-v4-flash": {
      "input": 0.091,
      "output": 0.182
    },
    "qwen/qwen3.6-flash": {
      "input": 0.1875,
      "output": 1.125
    },
    "deepseek/deepseek-v3.2": {
      "input": 0.28,
      "output": 0.42
    },
    "z-ai/glm-4.6": {
      "input": 0.55,
      "output": 2.2
    },
    "google/gemini-3.5-flash": {
      "input": 1.5,
      "output": 9
    },
    "openai/gpt-5.6-luna": {
      "input": 0.2,
      "output": 1.2
    },
    "anthropic/claude-haiku-4.5": {
      "input": 1,
      "output": 5
    },
    "anthropic/claude-sonnet-5": {
      "input": 2,
      "output": 10
    }
  }
} as const
