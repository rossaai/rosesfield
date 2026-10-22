export type ShowcaseRow = {
  runId: string
  file: string
  appId: string
  kind: "image" | "video"
  width: number
  height: number
  model: string
  prompt: string | null
  inputs: Readonly<Record<string, string>>
  aspectRatio: string | null
  credits: number
  seconds: number
  madeAt: string
  banner?: "start" | "end"
}

export const showcaseRows: readonly ShowcaseRow[] = [
  {
    runId: "70b933ac-d049-47aa-a6aa-cc89f09dc456",
    file: "portrait-woman.webp",
    appId: "image",
    kind: "image",
    width: 864,
    height: 1152,
    model: "z_image_turbo_bf16.safetensors",
    prompt:
      "A straight-on head-and-shoulders portrait captures an invented woman in her early thirties with warm brown skin, short natural black curls and dark brown eyes, looking directly into the camera with a calm, relaxed expression and closed lips. She wears a plain rust-coloured crew-neck knit sweater with a fine ribbed texture. Her face is centred in the frame, both eyes sharp and level, with clear catchlights in the irises and visible skin pores. The setting is a plain studio backdrop in warm grey, softly out of focus. The photograph is taken on an 85mm portrait lens at f/2.8, eye level, framed from the top of the head to the upper chest. Soft light falls from outside the frame on the left of the picture, so the cheek on the left of the picture is the brightest part of the face and the cheek on the right of the picture sits in a gentle shadow. No lamp, softbox or light fixture is visible, and the backdrop is plain and empty. The palette is warm terracotta, umber and soft grey. The finish is a natural, sharp editorial photograph with true skin tones, fine detail, no text, no logo and no watermark.",
    inputs: { model: "z-image-turbo", resolution: "1k" },
    aspectRatio: "3:4",
    credits: 0.66,
    seconds: 21,
    madeAt: "2026-10-20T22:59:58Z",
    banner: "start",
  },
  {
    runId: "cb3281e7-8764-475f-848b-8cc386311bae",
    file: "still-in-the-street.mp4",
    appId: "effects",
    kind: "video",
    width: 540,
    height: 960,
    model: "ltx-2.5-22b-distilled-transformer-bf16.safetensors",
    prompt: null,
    inputs: { effect: "still-in-the-street", resolution: "1080p" },
    aspectRatio: "9:16",
    credits: 19.24,
    seconds: 102.2,
    madeAt: "2026-10-21T22:04:40Z",
  },
  {
    runId: "58bdf412-f014-462f-99e7-7308cee99c2a",
    file: "sneaker.webp",
    appId: "image",
    kind: "image",
    width: 1280,
    height: 960,
    model: "z_image_turbo_bf16.safetensors",
    prompt:
      "A side-profile product shot at the height of the shoe captures a single invented low-top running sneaker, pointing to the left, resting on a block of pale travertine stone. The sneaker has an upper of off-white knit mesh, a smooth suede heel panel in sage green, round white laces, and a thick sculpted foam sole in cream with a thin gum rubber outsole. It carries no logo, no stripes, no lettering and no brand mark of any kind. The background is a seamless sweep of warm sand colour, plain and empty. The photograph is taken on a 100mm macro lens at f/11, the whole shoe in sharp focus, showing the knit texture and the stitching. Lighting is a large soft light from above the shoe with a white fill from the front, giving a soft shadow under the sole on the stone. The palette is off-white, sage green, cream and warm sand. The finish is a clean, crisp commercial product photograph with fine detail, no text and no watermark.",
    inputs: { model: "z-image-turbo", resolution: "2k" },
    aspectRatio: "4:3",
    credits: 1.91,
    seconds: 15,
    madeAt: "2026-10-20T23:16:08Z",
  },
  {
    runId: "1e77db70-4ebe-4050-97e4-84f118438aeb",
    file: "push-into-eye.mp4",
    appId: "effects",
    kind: "video",
    width: 540,
    height: 720,
    model: "ltx-2.5-22b-distilled-transformer-bf16.safetensors",
    prompt: null,
    inputs: { effect: "push-into-eye", resolution: "1080p" },
    aspectRatio: "3:4",
    credits: 37.89,
    seconds: 162.3,
    madeAt: "2026-10-21T21:02:43Z",
  },
  {
    runId: "70ab1a97-f67a-4ab2-a1b9-c69c3fcbba95",
    file: "portrait-man.webp",
    appId: "image",
    kind: "image",
    width: 960,
    height: 1280,
    model: "qwen_image_2512_fp8_e4m3fn.safetensors",
    prompt:
      "Head-and-shoulders photograph of an invented man about seventy years old, facing the camera at eye level, centred in the frame. Deep wrinkles, short white beard, thin grey hair, light brown eyes, calm face, lips closed. Plain navy jacket over a white shirt. Plain warm beige studio backdrop. Soft, even daylight on the face. Sharp, natural portrait photograph.",
    inputs: { model: "qwen-image-2512", resolution: "1k" },
    aspectRatio: "3:4",
    credits: 14.95,
    seconds: 87,
    madeAt: "2026-10-20T23:33:58Z",
    banner: "end",
  },
  {
    runId: "f9933ba3-f7e5-4318-a6f2-70e86ef5f040",
    file: "street-golden-hour.webp",
    appId: "image",
    kind: "image",
    width: 720,
    height: 1280,
    model: "z_image_turbo_bf16.safetensors",
    prompt:
      "Full-body photograph of an invented woman with pale freckled skin and shoulder-length copper red hair, standing still in the middle of a wide stone-paved pedestrian street at golden hour, facing the camera, hands at her sides. Long camel wool coat, black turtleneck, charcoal trousers, brown leather ankle boots. She is whole from head to shoes, with open paving around her and above her head. Red brick buildings with tall windows and young trees on both sides. Warm low golden sunlight and long shadows on the paving. Sharp natural photograph.",
    inputs: { model: "z-image-turbo", resolution: "2k" },
    aspectRatio: "9:16",
    credits: 2.35,
    seconds: 15,
    madeAt: "2026-10-20T23:40:33Z",
  },
]
