import { AppDefinitionInvalidError } from "#app-definition-invalid.error"
import { heldFilesOf } from "#comfy/cloud-weights"
import {
  type ClipPreset,
  type PhotoPreset,
  type VfxPreset,
  vfxPresets,
} from "#vfx/vfx-preset.contract"

const flipIntoANewPlace: PhotoPreset = {
  id: "flip-into-a-new-place",
  kind: "photo",
  guide: {
    file: "flip-into-a-new-place.mp4",
    sha256: "0d4dac65d6b5acf59e6c626463453b1c57b066727bfdc3f0f70091ea64d90a43",
    bytes: 172_490,
    width: 352,
    height: 640,
    frames: 205,
    fps: 24,
  },
  prompt:
    "A pale stone hall with tall arched windows high on the far wall and a hanging iron chandelier. The person from the first frame sits on a tall dark carved wooden throne on a low platform at the end of a table draped in deep red cloth, leaning back, forearms on the armrests, legs stretched along the table between loaves of bread and a brass bowl. The camera cranes up and tilts down toward them, pauses, then sweeps over their head, looks straight down on them, flips over the top of the throne and dives behind its dark carved back until the wood fills the frame. Out of that darkness the camera rises over the black padded rail of a green felt card table in a dim room lined with shelves of bottles and warm lamps, where the same person, in the same clothes, leans over the table with cards and stacks of chips, and the camera settles and drifts slowly back.",
  result: null,
}

const ticketWipe: PhotoPreset = {
  id: "ticket-wipe",
  kind: "photo",
  guide: {
    file: "ticket-wipe.mp4",
    sha256: "74d250f0c11a0f26b3b3993e52e81868b75ed27d3e8094460ff6a12e190f96cf",
    bytes: 87_178,
    width: 480,
    height: 352,
    frames: 217,
    fps: 24,
  },
  prompt:
    "A full-body side view of the person walking at an even pace from left to right across a seamless warm paper studio, with the camera tracking beside them at hip height. They look down at the phone in their right hand, then raise their left hand to shade their eyes and look ahead, lower it, turn to face the camera, stop with their feet apart and wave once with their right hand at shoulder height. Soft even front light. The paper backdrop stays plain and empty, with no shadow on it.",
  result: null,
}

const grabAndRun: PhotoPreset = {
  id: "grab-and-run",
  kind: "photo",
  guide: {
    file: "grab-and-run.mp4",
    sha256: "58ce895ccf0c7472d4307fa0719cb3cfe3d3c64c0cf2c805cd69c944d1b31d7e",
    bytes: 308_586,
    width: 352,
    height: 640,
    frames: 240,
    fps: 24,
  },
  prompt:
    "A medium shot from inside a parked car at golden hour looks across the worn back seat to the rear door window, a glass bottle leaning on the seat, and the camera remains static. Outside, the person from the first frame leans to the glass and presses both palms flat on it. Initially they glance left down the street, then duck below the sill. A moment later they rise with a rock in their right hand and strike the window. The tempered glass crazes white and falls inward in small cubes that scatter across the seat. They reach through the hole, grip the bottle by the neck and pull it out as the camera pushes in on their hand. A hard cut transitions to a low wide shot on a cobbled street in the same warm evening light. The same person in the same clothes sprints toward the lens with the bottle in their fist while the camera tracks backward ahead of them and turns with them around a corner. Two police officers run behind them and a patrol car's lights flash far back. Near the end they look back over their shoulder. Natural motion blur, film-grade color, crisp detail. A sharp glass crash, then running footsteps and distant sirens.",
  result: null,
}

const floodTheStreet: ClipPreset = {
  id: "flood-the-street",
  kind: "clip",
  adapter: {
    file: "ltx-2.3-22b-ic-lora-water-simulation-0.9.safetensors",
    strength: 1.25,
  },
  prompt:
    "Reference shows the dry scene. Edited shows the same scene with water added.\nADD WATER Murky floodwater covers the whole ground, rippling and catching the light, splashing around every person and car that moves through it.",
  negative: "",
  result: null,
}

const dayToNight: ClipPreset = {
  id: "day-to-night",
  kind: "clip",
  adapter: {
    file: "ltx-2.3-22b-ic-lora-day-to-night-0.9.safetensors",
    strength: 1,
  },
  prompt:
    "A realistic nighttime scene of the same place, the same people and the same camera move, lit by photorealistic moonlight and the warm light of street lamps and windows, with deep natural shadows. Only the lighting changes.",
  negative: "pitch black, underexposed, daylight, blue sky",
  result: null,
}

const vanish: ClipPreset = {
  id: "vanish",
  kind: "clip",
  adapter: {
    file: "ltx-2.3-22b-ic-lora-clean-plate-1.0.safetensors",
    strength: 1,
  },
  prompt:
    "An empty clean plate of the exact same location: identical background, identical light and identical camera move, with no people, no figures and no vehicles.",
  negative: "people, person, figures, crowd, pedestrians, cars, vehicles",
  result: null,
}

export const presetOrder: readonly VfxPreset[] = [
  flipIntoANewPlace,
  ticketWipe,
  grabAndRun,
  floodTheStreet,
  dayToNight,
  vanish,
]

export function readPresets(source: readonly unknown[]): VfxPreset[] {
  const parsed = vfxPresets.safeParse(source)
  if (!parsed.success) {
    throw new AppDefinitionInvalidError({
      folder: "vfx",
      reason: parsed.error.issues
        .map((issue) => `${issue.path.join(".")} ${issue.message}`)
        .join(", "),
    })
  }
  return parsed.data
}

export function heldPresets(
  presets: readonly VfxPreset[],
  held: ReadonlySet<string>
): VfxPreset[] {
  return presets.filter(
    (preset) => preset.kind === "photo" || held.has(preset.adapter.file)
  )
}

export const offeredPresets: readonly VfxPreset[] = heldPresets(
  readPresets(presetOrder),
  heldFilesOf()
)

export function presetKeyOf(id: string): string {
  return id.replace(/-([a-z0-9])/g, (_, letter: string) => letter.toUpperCase())
}

export function presetOf(
  id: string,
  presets: readonly VfxPreset[] = offeredPresets
): VfxPreset | null {
  return presets.find((preset) => preset.id === id) ?? null
}

export function photoPresetIds(presets: readonly VfxPreset[]): string[] {
  return presets.filter((one) => one.kind === "photo").map((one) => one.id)
}

export function clipPresetIds(presets: readonly VfxPreset[]): string[] {
  return presets.filter((one) => one.kind === "clip").map((one) => one.id)
}
