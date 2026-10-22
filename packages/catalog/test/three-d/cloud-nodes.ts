export const recordedFrom =
  "GET https://cloud.comfy.org/api/object_info at 2026-10-19T08:02:55Z"

export type CloudNode = {
  required: readonly string[]
  outputs: readonly string[]
  isOutput: boolean
}

export const cloudNodes: Readonly<Record<string, CloudNode>> = {
  CFGOverride: {
    required: ["model", "cfg", "start_percent", "end_percent"],
    outputs: ["MODEL"],
    isOutput: false,
  },
  CLIPVisionLoader: {
    required: ["clip_name"],
    outputs: ["CLIP_VISION"],
    isOutput: false,
  },
  DecimateMesh: {
    required: ["mesh", "target_face_count", "placement_mode"],
    outputs: ["MESH"],
    isOutput: false,
  },
  EmptyTrellis2LatentStructure: {
    required: ["batch_size"],
    outputs: ["LATENT"],
    isOutput: false,
  },
  ImageCropToMask: {
    required: [
      "images",
      "masks",
      "width",
      "height",
      "pad_factor",
      "grow_mask",
      "background",
    ],
    outputs: ["IMAGE"],
    isOutput: false,
  },
  KSampler: {
    required: [
      "model",
      "seed",
      "steps",
      "cfg",
      "sampler_name",
      "scheduler",
      "positive",
      "negative",
      "latent_image",
      "denoise",
    ],
    outputs: ["LATENT"],
    isOutput: false,
  },
  LoadBackgroundRemovalModel: {
    required: ["bg_removal_name"],
    outputs: ["BACKGROUND_REMOVAL"],
    isOutput: false,
  },
  LoadImage: {
    required: ["image"],
    outputs: ["IMAGE", "MASK"],
    isOutput: false,
  },
  LoadMoGeModel: {
    required: ["model_name"],
    outputs: ["MOGE_MODEL"],
    isOutput: false,
  },
  MoGeGeometryToFOV: {
    required: ["moge_geometry", "axis", "unit"],
    outputs: ["FLOAT", "FLOAT"],
    isOutput: false,
  },
  MoGeInference: {
    required: [
      "moge_model",
      "image",
      "resolution_level",
      "fov_x_degrees",
      "batch_size",
      "force_projection",
      "apply_mask",
      "refine_steps",
    ],
    outputs: ["MOGE_GEOMETRY"],
    isOutput: false,
  },
  ModelSamplingSD3: {
    required: ["model", "shift"],
    outputs: ["MODEL"],
    isOutput: false,
  },
  Pixal3DConditioning: {
    required: ["clip_vision_model", "image", "camera_angle_x"],
    outputs: ["CONDITIONING", "CONDITIONING"],
    isOutput: false,
  },
  RemoveBackground: {
    required: ["bg_removal_model", "image"],
    outputs: ["MASK"],
    isOutput: false,
  },
  RescaleCFG: {
    required: ["model", "multiplier"],
    outputs: ["MODEL"],
    isOutput: false,
  },
  SaveGLB: {
    required: ["mesh", "filename_prefix"],
    outputs: [],
    isOutput: true,
  },
  Trellis2ShapeStage: {
    required: ["positive", "negative", "voxel"],
    outputs: ["CONDITIONING", "CONDITIONING", "LATENT"],
    isOutput: false,
  },
  Trellis2UpsampleStage: {
    required: [
      "positive",
      "negative",
      "shape_latent",
      "vae",
      "target_resolution",
    ],
    outputs: ["CONDITIONING", "CONDITIONING", "LATENT"],
    isOutput: false,
  },
  UNETLoader: {
    required: ["unet_name", "weight_dtype"],
    outputs: ["MODEL"],
    isOutput: false,
  },
  VAELoader: {
    required: ["vae_name"],
    outputs: ["VAE"],
    isOutput: false,
  },
  VaeDecodeShapeTrellis: {
    required: ["samples", "vae"],
    outputs: ["MESH", "SHAPE_SUBDIVIDES"],
    isOutput: false,
  },
  VaeDecodeStructureTrellis2: {
    required: ["samples", "vae", "resolution"],
    outputs: ["VOXEL"],
    isOutput: false,
  },
}
