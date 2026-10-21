import {
  type Graph,
  invalid,
  type Link,
  nodeOf,
  remove,
} from "#effects/comfy/graph-edit"
import {
  type EffectRecipe,
  maxHits,
  type SoundBed,
} from "#effects/effect-recipe.contract"

export const soundNode = "358"

export const loudnessNode = "359"

export const ceilingNodes: readonly string[] = ["360", "361"]

export const fadeOutNode = "362"

export const hitShared = {
  model: "630",
  encoder: "631",
  negative: "633",
} as const

export type HitSlot = {
  prompt: string
  length: string
  sampler: string
  decode: string
  gain: string
  lead: string
  placed: string
  merged: string
  tail: string
}

function hitSlotAt(index: number): HitSlot {
  const id = (step: number): string => String(660 + index * 10 + step)
  return {
    prompt: id(0),
    length: id(1),
    sampler: id(2),
    decode: id(3),
    gain: id(4),
    lead: id(5),
    placed: id(6),
    merged: id(7),
    tail: id(8),
  }
}

export const hitSlots: readonly HitSlot[] = Array.from(
  { length: maxHits },
  (_, index) => hitSlotAt(index)
)

export const hitTailSeconds = 0.3

export const bedGainNode = "649"

export const bedLevelNode = "648"

export const layerLufs = -20

export function hitLevelOf(slot: HitSlot): string {
  return String(Number(slot.prompt) + 9)
}

export const buildNodes = { floor: "650", rise: "651", sum: "652" } as const

export const brightenNode = "653"

const brightenLowCutHz = 20

export const peakMargin = 1

const maxCeilingGain = 24

export function setSound(graph: Graph, recipe: EffectRecipe): void {
  const sound = recipe.design.sound
  if (sound === null) {
    remove(graph, [soundNode, loudnessNode, ...ceilingNodes])
    delete nodeOf(graph, "370").inputs.audio
    return
  }
  const ceiling = sound.truePeakMax - peakMargin
  if (-ceiling > maxCeilingGain) {
    throw invalid(
      `the peak ceiling ${ceiling} dB of ${recipe.effect} is under -${maxCeilingGain} dB`
    )
  }
  const [up, down] = ceilingNodes
  nodeOf(graph, loudnessNode).inputs.lufs =
    (sound.loudness.min + sound.loudness.max) / 2
  nodeOf(graph, up ?? "").inputs.gain_db = -ceiling
  nodeOf(graph, down ?? "").inputs.gain_db = ceiling
  if (sound.fadeOut > 0) {
    graph[fadeOutNode] = {
      class_type: "AudioFadeOut",
      inputs: { audio: [down ?? "", 0], duration_seconds: sound.fadeOut },
    }
    nodeOf(graph, "370").inputs.audio = [fadeOutNode, 0]
  }
}

function shapeBed(graph: Graph, sound: SoundBed): Link {
  let bed: Link = [soundNode, 0]
  if (sound.hits.length > 0) {
    graph[bedLevelNode] = {
      class_type: "NormalizeAudioLoudness",
      inputs: { audio: bed, lufs: layerLufs },
    }
    bed = [bedLevelNode, 0]
  }
  if (sound.bedGainDb !== 0) {
    graph[bedGainNode] = {
      class_type: "AudioAdjustVolume",
      inputs: { audio: bed, volume: sound.bedGainDb },
    }
    bed = [bedGainNode, 0]
  }
  if (sound.build !== null) {
    graph[buildNodes.floor] = {
      class_type: "AudioAdjustVolume",
      inputs: { audio: bed, volume: sound.build.floorDb },
    }
    graph[buildNodes.rise] = {
      class_type: "AudioFadeIn",
      inputs: { audio: bed, duration_seconds: sound.build.seconds },
    }
    graph[buildNodes.sum] = {
      class_type: "AudioMerge",
      inputs: {
        audio1: [buildNodes.floor, 0],
        audio2: [buildNodes.rise, 0],
        merge_method: "add",
      },
    }
    bed = [buildNodes.sum, 0]
  }
  if (sound.brighten !== null) {
    graph[brightenNode] = {
      class_type: "AudioParametricEQ",
      inputs: {
        audio: bed,
        low_cut_hz: brightenLowCutHz,
        presence_boost_db: sound.brighten.presenceDb,
        air_boost_db: sound.brighten.airDb,
      },
    }
    bed = [brightenNode, 0]
  }
  return bed
}

export function setHits(graph: Graph, recipe: EffectRecipe): void {
  const sound = recipe.design.sound
  const hits = sound?.hits ?? []
  for (const slot of hitSlots.slice(hits.length)) {
    remove(graph, Object.values(slot))
  }
  if (hits.length === 0) {
    remove(graph, Object.values(hitShared))
  }
  if (sound === null) {
    return
  }
  let bed = shapeBed(graph, sound)
  hits.forEach((hit, index) => {
    const slot = hitSlots[index]
    if (slot === undefined) {
      throw invalid(`${recipe.effect} has more than ${maxHits} hits`)
    }
    nodeOf(graph, slot.prompt).inputs.text = hit.prompt
    nodeOf(graph, slot.length).inputs.seconds = hit.seconds
    const level = hitLevelOf(slot)
    graph[level] = {
      class_type: "NormalizeAudioLoudness",
      inputs: { audio: [slot.decode, 0], lufs: layerLufs },
    }
    nodeOf(graph, slot.gain).inputs.audio = [level, 0]
    nodeOf(graph, slot.gain).inputs.volume = hit.gainDb
    nodeOf(graph, slot.tail).inputs.duration_seconds = hitTailSeconds
    let placed: Link = [slot.placed, 0]
    if (hit.time > 0) {
      nodeOf(graph, slot.lead).inputs.duration = hit.time
    } else {
      remove(graph, [slot.lead, slot.placed])
      placed = [slot.tail, 0]
    }
    const merged = nodeOf(graph, slot.merged)
    merged.inputs.audio1 = bed
    merged.inputs.audio2 = placed
    bed = [slot.merged, 0]
  })
  nodeOf(graph, loudnessNode).inputs.audio = bed
}
