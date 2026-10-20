export const makerNames: Readonly<Record<string, string>> = {
  anthropic: "Anthropic",
  beeble: "Beeble",
  bfl: "Black Forest Labs",
  bria: "Bria",
  byteplus: "BytePlus",
  elevenlabs: "ElevenLabs",
  fal: "fal",
  freepik: "Freepik",
  "gemini-interactions": "Google",
  heygen: "HeyGen",
  higgsfield: "Higgsfield",
  ideogram: "Ideogram",
  kling: "Kling",
  krea: "Krea",
  ltx: "Lightricks",
  luma: "Luma",
  luma_2: "Luma",
  meshy: "Meshy",
  minimax: "MiniMax",
  moonvalley: "Moonvalley",
  openai: "OpenAI",
  openrouter: "OpenRouter",
  pika: "Pika",
  pruna: "Pruna",
  qwen: "Qwen",
  recraft: "Recraft",
  runware: "Runware",
  runway: "Runway",
  synclabs: "sync.",
  tencent: "Tencent",
  veo: "Google",
  vertexai: "Google",
  wavespeed: "WaveSpeed",
  xai: "xAI",
}

const upperWords: readonly string[] = [
  "gpt",
  "ltx",
  "sfx",
  "vto",
  "tts",
  "fibo",
  "flux",
  "h3",
  "o1",
  "o3",
  "o4",
  "3d",
  "pbr",
  "uv",
]

export function makerOf(provider: string): string {
  return Object.hasOwn(makerNames, provider)
    ? (makerNames[provider] ?? provider)
    : titleOf(provider.replace(/[_-]+/g, " "))
}

export function nameOf(id: string): string {
  const slug = id.split("/").slice(1).join("/")
  const spaced = slug
    .replace(/(\d)-(?=\d)/g, "$1.")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  return titleOf(spaced)
}

const makerWords: ReadonlyMap<string, string> = new Map(
  Object.values(makerNames)
    .filter((name) => !name.includes(" ") && name !== name.toLowerCase())
    .map((name) => [name.toLowerCase(), name])
)

function titleOf(text: string): string {
  return text
    .split(" ")
    .map((word) => {
      const lower = word.toLowerCase()
      if (upperWords.includes(lower)) {
        return word.toUpperCase()
      }
      return (
        makerWords.get(lower) ?? word.charAt(0).toUpperCase() + word.slice(1)
      )
    })
    .join(" ")
}
