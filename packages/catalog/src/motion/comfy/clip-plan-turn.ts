import { z } from "zod"
import { clipPlanLimits } from "#motion/clip-plan"

export type PlanImage = {
  mime: "image/jpeg" | "image/png" | "image/webp"
  base64: string
}

export type ClipPlanInput = {
  frames: readonly PlanImage[]
  photos: readonly PlanImage[]
  sentence: string
}

export const clipPlanRoute = "openrouter/chat-completions"

export const clipPlanModel = "z-ai/glm-5.3-flash"

const planOutputTokens = 3000

const planRules = [
  "You plan a change to a video. You get 4 frames of the video in order, then the person's photos, numbered from 1, then an optional sentence from the person.",
  `Find up to ${clipPlanLimits.mostTargets} things in the video that the photos should replace or dress: a person, a character, a product or a piece of clothing. Follow the sentence when it names what to change.`,
  'For each thing: find, a few plain words that pick it out in the first frame, such as "the man in the grey coat", with no comma, colon or parenthesis. becomes, what it turns into, from its photos. photos, the numbers of the photos it uses.',
  "Leave a photo out when it matches nothing in the video. Return no thing when nothing in the video matches the photos or the sentence.",
  "editPrompt: one instruction for an image editor that gets the first frame as image 1 and the photos you used after it. It keeps the frame's framing, camera, light, pose and every other part, and changes only the things you found, each into its photos.",
  "scene: the video as it should look after the change, for a video model: who is in it as the photos show them, what their clothes and hands do, what happens, the camera's move, and one sentence of sound. Describe only what is seen and heard. Never name a depth map, a mask, a guide, a control or a technique.",
].join("\n")

const responseSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    targets: {
      type: "array",
      maxItems: clipPlanLimits.mostTargets,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          find: { type: "string" },
          becomes: { type: "string" },
          photos: { type: "array", items: { type: "integer" } },
        },
        required: ["find", "becomes", "photos"],
      },
    },
    editPrompt: { type: "string" },
    scene: { type: "string" },
  },
  required: ["targets", "editPrompt", "scene"],
}

function imagePart(image: PlanImage): Record<string, unknown> {
  return {
    type: "image_url",
    image_url: { url: `data:${image.mime};base64,${image.base64}` },
  }
}

function sentencePart(sentence: string): Record<string, unknown>[] {
  const words = sentence.trim()
  return words === ""
    ? [{ type: "text", text: "The person wrote no sentence." }]
    : [{ type: "text", text: `The person's sentence: ${words}` }]
}

export function clipPlanBodyOf(input: ClipPlanInput): Record<string, unknown> {
  return {
    model: clipPlanModel,
    messages: [
      { role: "system", content: planRules },
      {
        role: "user",
        content: [
          { type: "text", text: "The video's frames, first to last." },
          ...input.frames.map(imagePart),
          ...input.photos.flatMap((photo, at) => [
            { type: "text", text: `Photo ${at + 1}.` },
            imagePart(photo),
          ]),
          ...sentencePart(input.sentence),
        ],
      },
    ],
    temperature: 0,
    max_tokens: planOutputTokens,
    reasoning: { effort: "low", exclude: true },
    response_format: {
      type: "json_schema",
      json_schema: { name: "clip_plan", strict: true, schema: responseSchema },
    },
  }
}

const chatAnswer = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({ content: z.string().nullable() }),
      })
    )
    .min(1),
})

/** Reads the JSON the answer's message holds, or null when it holds none. */
export function clipPlanReplyOf(answer: unknown): unknown {
  const parsed = chatAnswer.safeParse(answer)
  const text = parsed.success
    ? (parsed.data.choices[0]?.message.content ?? "")
    : ""
  const fenced = /^\s*```(?:json)?\s*([\s\S]*?)\s*```\s*$/.exec(text)
  try {
    return JSON.parse(fenced?.[1] ?? text)
  } catch {
    return null
  }
}
