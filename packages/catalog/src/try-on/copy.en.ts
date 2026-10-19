export const tryOnCopy: Readonly<Record<string, string>> = {
  "tryOn.name": "Try-on",
  "try-on.line": "Put the clothes from one photo on the person in another.",
  "try-on.keywords": "clothes, outfit, wear, dress, shirt, fashion",
  "tryOn.input.person.label": "Person",
  "try-on.input.person.note":
    "The person who wears the clothes. One person, with the body the clothes cover in view.",
  "try-on.input.person.limits":
    "PNG, JPEG or WebP, up to 20 MB, at least 512 pixels on the short side, with a long side at most 2 times the short side.",
  "try-on.input.person.required": "Add a photo of the person",
  "try-on.input.person.tooSmall":
    "This photo is {side} pixels on its short side. Pick one of {min} pixels or more.",
  "try-on.input.person.unreadable":
    "This browser cannot open this photo, so its size is unknown. Pick another PNG, JPEG or WebP file.",
  "try-on.input.person.badRatio":
    "This photo's long side is more than {max} times its short side. Pick a photo with a closer ratio.",
  "tryOn.input.clothes.label": "Clothes",
  "try-on.input.clothes.note":
    "The clothes to put on, worn by a model, on a hanger or flat. Nothing else worn.",
  "try-on.input.clothes.limits":
    "PNG, JPEG or WebP, up to 20 MB, at least 512 pixels on the short side.",
  "try-on.input.clothes.required": "Add a photo of the clothes",
  "try-on.input.clothes.tooSmall":
    "This photo is {side} pixels on its short side. Pick one of {min} pixels or more.",
  "try-on.input.clothes.unreadable":
    "This browser cannot open this photo, so its size is unknown. Pick another PNG, JPEG or WebP file.",
  "try-on.input.photo.kinds": "PNG, JPEG or WebP images",
  "tryOn.input.part.label": "Put on",
  "try-on.input.part.note":
    "A top is a shirt, a jacket or a sweater. A bottom is trousers, a skirt or shorts. A dress needs Everything.",
  "tryOn.choice.part.all": "Everything",
  "tryOn.choice.part.top": "Top only",
  "tryOn.choice.part.bottom": "Bottom only",
  "tryOn.input.model.label": "Model",
  "tryOn.model.qwenImageEdit2511": "Qwen Image Edit 2511",
  "tryOn.model.qwenImageEdit2511.line":
    "Edits your Person photo with your Clothes photo as the reference.",
  "tryOn.model.qwenImageEdit2511Lightning": "Qwen Image Edit 2511 Lightning",
  "tryOn.model.qwenImageEdit2511Lightning.line": "The same model in 4 steps.",
  "tryOn.model.flux2Klein4b": "FLUX.2 Klein 4B",
  "tryOn.model.flux2Klein4b.line": "A smaller model that runs in 4 steps.",
  "tryOn.input.seed.label": "Seed",
}
