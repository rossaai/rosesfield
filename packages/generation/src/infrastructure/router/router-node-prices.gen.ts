// Written by packages/generation/scripts/node-prices-sync.ts from the price badge each Comfy partner node publishes. Do not edit.

export const nodePrices = {
  "repository": "Comfy-Org/ComfyUI",
  "commit": "cdf272f3514353aab04dc2d9fceef57a260dc156",
  "readOn": "2026-10-26",
  "models": {
    "bfl/flux-pro-1.1-ultra": {
      "node": "FluxProUltraImageNode",
      "source": "https://github.com/Comfy-Org/ComfyUI/blob/cdf272f3514353aab04dc2d9fceef57a260dc156/comfy_api_nodes/nodes_bfl.py#L116",
      "per": "run",
      "entries": [
        {
          "when": {},
          "low": 0.06,
          "high": 0.06,
          "approximate": false
        }
      ]
    },
    "bfl/flux-pro-1.0-expand": {
      "node": "FluxProExpandNode",
      "source": "https://github.com/Comfy-Org/ComfyUI/blob/cdf272f3514353aab04dc2d9fceef57a260dc156/comfy_api_nodes/nodes_bfl.py#L376",
      "per": "run",
      "entries": [
        {
          "when": {},
          "low": 0.05,
          "high": 0.05,
          "approximate": false
        }
      ]
    },
    "bfl/flux-pro-1.0-fill": {
      "node": "FluxProFillNode",
      "source": "https://github.com/Comfy-Org/ComfyUI/blob/cdf272f3514353aab04dc2d9fceef57a260dc156/comfy_api_nodes/nodes_bfl.py#L486",
      "per": "run",
      "entries": [
        {
          "when": {},
          "low": 0.05,
          "high": 0.05,
          "approximate": false
        }
      ]
    },
    "bfl/erase-v1": {
      "node": "FluxEraseNode",
      "source": "https://github.com/Comfy-Org/ComfyUI/blob/cdf272f3514353aab04dc2d9fceef57a260dc156/comfy_api_nodes/nodes_bfl.py#L574",
      "per": "run",
      "entries": [
        {
          "when": {},
          "low": 0.03,
          "high": 0.06,
          "approximate": true
        }
      ]
    },
    "bfl/vto-v1": {
      "node": "FluxVTONode",
      "source": "https://github.com/Comfy-Org/ComfyUI/blob/cdf272f3514353aab04dc2d9fceef57a260dc156/comfy_api_nodes/nodes_bfl.py#L654",
      "per": "run",
      "entries": [
        {
          "when": {},
          "low": 0.0375,
          "high": 0.075,
          "approximate": true
        }
      ]
    },
    "bfl/flux-2-pro": {
      "node": "Flux2ImageNode",
      "source": "https://github.com/Comfy-Org/ComfyUI/blob/cdf272f3514353aab04dc2d9fceef57a260dc156/comfy_api_nodes/nodes_bfl.py#L922",
      "per": "run",
      "entries": [
        {
          "when": {
            "width": 512,
            "height": 512
          },
          "low": 0.03,
          "high": 0.03,
          "approximate": false
        },
        {
          "when": {
            "width": 512,
            "height": 768
          },
          "low": 0.03,
          "high": 0.03,
          "approximate": false
        },
        {
          "when": {
            "width": 512,
            "height": 1024
          },
          "low": 0.03,
          "high": 0.03,
          "approximate": false
        },
        {
          "when": {
            "width": 512,
            "height": 1536
          },
          "low": 0.03,
          "high": 0.03,
          "approximate": false
        },
        {
          "when": {
            "width": 512,
            "height": 2048
          },
          "low": 0.03,
          "high": 0.03,
          "approximate": false
        },
        {
          "when": {
            "width": 768,
            "height": 512
          },
          "low": 0.03,
          "high": 0.03,
          "approximate": false
        },
        {
          "when": {
            "width": 768,
            "height": 768
          },
          "low": 0.03,
          "high": 0.03,
          "approximate": false
        },
        {
          "when": {
            "width": 768,
            "height": 1024
          },
          "low": 0.03,
          "high": 0.03,
          "approximate": false
        },
        {
          "when": {
            "width": 768,
            "height": 1536
          },
          "low": 0.045,
          "high": 0.045,
          "approximate": false
        },
        {
          "when": {
            "width": 768,
            "height": 2048
          },
          "low": 0.045,
          "high": 0.045,
          "approximate": false
        },
        {
          "when": {
            "width": 1024,
            "height": 512
          },
          "low": 0.03,
          "high": 0.03,
          "approximate": false
        },
        {
          "when": {
            "width": 1024,
            "height": 768
          },
          "low": 0.03,
          "high": 0.03,
          "approximate": false
        },
        {
          "when": {
            "width": 1024,
            "height": 1024
          },
          "low": 0.03,
          "high": 0.03,
          "approximate": false
        },
        {
          "when": {
            "width": 1024,
            "height": 1536
          },
          "low": 0.045,
          "high": 0.045,
          "approximate": false
        },
        {
          "when": {
            "width": 1024,
            "height": 2048
          },
          "low": 0.045,
          "high": 0.045,
          "approximate": false
        },
        {
          "when": {
            "width": 1536,
            "height": 512
          },
          "low": 0.03,
          "high": 0.03,
          "approximate": false
        },
        {
          "when": {
            "width": 1536,
            "height": 768
          },
          "low": 0.045,
          "high": 0.045,
          "approximate": false
        },
        {
          "when": {
            "width": 1536,
            "height": 1024
          },
          "low": 0.045,
          "high": 0.045,
          "approximate": false
        },
        {
          "when": {
            "width": 1536,
            "height": 1536
          },
          "low": 0.06,
          "high": 0.06,
          "approximate": false
        },
        {
          "when": {
            "width": 1536,
            "height": 2048
          },
          "low": 0.06,
          "high": 0.06,
          "approximate": false
        },
        {
          "when": {
            "width": 2048,
            "height": 512
          },
          "low": 0.03,
          "high": 0.03,
          "approximate": false
        },
        {
          "when": {
            "width": 2048,
            "height": 768
          },
          "low": 0.045,
          "high": 0.045,
          "approximate": false
        },
        {
          "when": {
            "width": 2048,
            "height": 1024
          },
          "low": 0.045,
          "high": 0.045,
          "approximate": false
        },
        {
          "when": {
            "width": 2048,
            "height": 1536
          },
          "low": 0.06,
          "high": 0.06,
          "approximate": false
        },
        {
          "when": {
            "width": 2048,
            "height": 2048
          },
          "low": 0.075,
          "high": 0.075,
          "approximate": false
        }
      ]
    },
    "bfl/flux-2-max": {
      "node": "Flux2ImageNode",
      "source": "https://github.com/Comfy-Org/ComfyUI/blob/cdf272f3514353aab04dc2d9fceef57a260dc156/comfy_api_nodes/nodes_bfl.py#L922",
      "per": "run",
      "entries": [
        {
          "when": {
            "width": 512,
            "height": 512
          },
          "low": 0.07,
          "high": 0.07,
          "approximate": false
        },
        {
          "when": {
            "width": 512,
            "height": 768
          },
          "low": 0.07,
          "high": 0.07,
          "approximate": false
        },
        {
          "when": {
            "width": 512,
            "height": 1024
          },
          "low": 0.07,
          "high": 0.07,
          "approximate": false
        },
        {
          "when": {
            "width": 512,
            "height": 1536
          },
          "low": 0.07,
          "high": 0.07,
          "approximate": false
        },
        {
          "when": {
            "width": 512,
            "height": 2048
          },
          "low": 0.07,
          "high": 0.07,
          "approximate": false
        },
        {
          "when": {
            "width": 768,
            "height": 512
          },
          "low": 0.07,
          "high": 0.07,
          "approximate": false
        },
        {
          "when": {
            "width": 768,
            "height": 768
          },
          "low": 0.07,
          "high": 0.07,
          "approximate": false
        },
        {
          "when": {
            "width": 768,
            "height": 1024
          },
          "low": 0.07,
          "high": 0.07,
          "approximate": false
        },
        {
          "when": {
            "width": 768,
            "height": 1536
          },
          "low": 0.1,
          "high": 0.1,
          "approximate": false
        },
        {
          "when": {
            "width": 768,
            "height": 2048
          },
          "low": 0.1,
          "high": 0.1,
          "approximate": false
        },
        {
          "when": {
            "width": 1024,
            "height": 512
          },
          "low": 0.07,
          "high": 0.07,
          "approximate": false
        },
        {
          "when": {
            "width": 1024,
            "height": 768
          },
          "low": 0.07,
          "high": 0.07,
          "approximate": false
        },
        {
          "when": {
            "width": 1024,
            "height": 1024
          },
          "low": 0.07,
          "high": 0.07,
          "approximate": false
        },
        {
          "when": {
            "width": 1024,
            "height": 1536
          },
          "low": 0.1,
          "high": 0.1,
          "approximate": false
        },
        {
          "when": {
            "width": 1024,
            "height": 2048
          },
          "low": 0.1,
          "high": 0.1,
          "approximate": false
        },
        {
          "when": {
            "width": 1536,
            "height": 512
          },
          "low": 0.07,
          "high": 0.07,
          "approximate": false
        },
        {
          "when": {
            "width": 1536,
            "height": 768
          },
          "low": 0.1,
          "high": 0.1,
          "approximate": false
        },
        {
          "when": {
            "width": 1536,
            "height": 1024
          },
          "low": 0.1,
          "high": 0.1,
          "approximate": false
        },
        {
          "when": {
            "width": 1536,
            "height": 1536
          },
          "low": 0.13,
          "high": 0.13,
          "approximate": false
        },
        {
          "when": {
            "width": 1536,
            "height": 2048
          },
          "low": 0.13,
          "high": 0.13,
          "approximate": false
        },
        {
          "when": {
            "width": 2048,
            "height": 512
          },
          "low": 0.07,
          "high": 0.07,
          "approximate": false
        },
        {
          "when": {
            "width": 2048,
            "height": 768
          },
          "low": 0.1,
          "high": 0.1,
          "approximate": false
        },
        {
          "when": {
            "width": 2048,
            "height": 1024
          },
          "low": 0.1,
          "high": 0.1,
          "approximate": false
        },
        {
          "when": {
            "width": 2048,
            "height": 1536
          },
          "low": 0.13,
          "high": 0.13,
          "approximate": false
        },
        {
          "when": {
            "width": 2048,
            "height": 2048
          },
          "low": 0.16,
          "high": 0.16,
          "approximate": false
        }
      ]
    },
    "bfl/flux-3-image": {
      "node": "Flux3ImageNode",
      "source": "https://github.com/Comfy-Org/ComfyUI/blob/cdf272f3514353aab04dc2d9fceef57a260dc156/comfy_api_nodes/nodes_bfl.py#L1728",
      "per": "run",
      "entries": [
        {
          "when": {
            "resolution": "768sq"
          },
          "low": 0.05863,
          "high": 0.05863,
          "approximate": false
        },
        {
          "when": {
            "resolution": "1k"
          },
          "low": 0.06864,
          "high": 0.06864,
          "approximate": false
        },
        {
          "when": {
            "resolution": "1.5k"
          },
          "low": 0.1001,
          "high": 0.1001,
          "approximate": false
        },
        {
          "when": {
            "resolution": "2k"
          },
          "low": 0.143,
          "high": 0.143,
          "approximate": false
        },
        {
          "when": {
            "resolution": "4k"
          },
          "low": 0.86801,
          "high": 0.86801,
          "approximate": false
        }
      ]
    },
    "bria/image": {
      "node": "BriaImageGenerate",
      "source": "https://github.com/Comfy-Org/ComfyUI/blob/cdf272f3514353aab04dc2d9fceef57a260dc156/comfy_api_nodes/nodes_bria.py#L1247",
      "per": "run",
      "entries": [
        {
          "when": {},
          "low": 0.0572,
          "high": 0.0572,
          "approximate": false
        }
      ]
    },
    "bria/image-edit-product-holding": {
      "node": "BriaProductHolding",
      "source": "https://github.com/Comfy-Org/ComfyUI/blob/cdf272f3514353aab04dc2d9fceef57a260dc156/comfy_api_nodes/nodes_bria.py#L1967",
      "per": "run",
      "entries": [
        {
          "when": {},
          "low": 0.0572,
          "high": 0.0572,
          "approximate": false
        }
      ]
    },
    "bria/image-edit-product-virtual-tryon": {
      "node": "BriaVirtualTryOn",
      "source": "https://github.com/Comfy-Org/ComfyUI/blob/cdf272f3514353aab04dc2d9fceef57a260dc156/comfy_api_nodes/nodes_bria.py#L2024",
      "per": "run",
      "entries": [
        {
          "when": {},
          "low": 0.0572,
          "high": 0.0572,
          "approximate": false
        }
      ]
    },
    "bria/image-edit-remove-background-guided": {
      "node": "BriaGuidedRemoveBackground",
      "source": "https://github.com/Comfy-Org/ComfyUI/blob/cdf272f3514353aab04dc2d9fceef57a260dc156/comfy_api_nodes/nodes_bria.py#L1920",
      "per": "run",
      "entries": [
        {
          "when": {},
          "low": 0.0429,
          "high": 0.0429,
          "approximate": false
        }
      ]
    },
    "xai/grok-imagine-image": {
      "node": "GrokImageNode",
      "source": "https://github.com/Comfy-Org/ComfyUI/blob/cdf272f3514353aab04dc2d9fceef57a260dc156/comfy_api_nodes/nodes_grok.py#L208",
      "per": "run",
      "entries": [
        {
          "when": {
            "resolution": "1k",
            "quality": "low"
          },
          "low": 0.02,
          "high": 0.02,
          "approximate": false
        },
        {
          "when": {
            "resolution": "1k",
            "quality": "medium"
          },
          "low": 0.02,
          "high": 0.02,
          "approximate": false
        },
        {
          "when": {
            "resolution": "1k",
            "quality": "high"
          },
          "low": 0.02,
          "high": 0.02,
          "approximate": false
        },
        {
          "when": {
            "resolution": "2k",
            "quality": "low"
          },
          "low": 0.02,
          "high": 0.02,
          "approximate": false
        },
        {
          "when": {
            "resolution": "2k",
            "quality": "medium"
          },
          "low": 0.02,
          "high": 0.02,
          "approximate": false
        },
        {
          "when": {
            "resolution": "2k",
            "quality": "high"
          },
          "low": 0.02,
          "high": 0.02,
          "approximate": false
        }
      ]
    },
    "xai/grok-imagine-image-2.0": {
      "node": "GrokImageNode",
      "source": "https://github.com/Comfy-Org/ComfyUI/blob/cdf272f3514353aab04dc2d9fceef57a260dc156/comfy_api_nodes/nodes_grok.py#L208",
      "per": "run",
      "entries": [
        {
          "when": {
            "resolution": "1k",
            "quality": "low"
          },
          "low": 0.04,
          "high": 0.04,
          "approximate": false
        },
        {
          "when": {
            "resolution": "1k",
            "quality": "medium"
          },
          "low": 0.06,
          "high": 0.06,
          "approximate": false
        },
        {
          "when": {
            "resolution": "1k",
            "quality": "high"
          },
          "low": 0.06,
          "high": 0.06,
          "approximate": false
        },
        {
          "when": {
            "resolution": "2k",
            "quality": "low"
          },
          "low": 0.06,
          "high": 0.06,
          "approximate": false
        },
        {
          "when": {
            "resolution": "2k",
            "quality": "medium"
          },
          "low": 0.08,
          "high": 0.08,
          "approximate": false
        },
        {
          "when": {
            "resolution": "2k",
            "quality": "high"
          },
          "low": 0.08,
          "high": 0.08,
          "approximate": false
        }
      ]
    },
    "xai/grok-imagine-image-pro": {
      "node": "GrokImageNode",
      "source": "https://github.com/Comfy-Org/ComfyUI/blob/cdf272f3514353aab04dc2d9fceef57a260dc156/comfy_api_nodes/nodes_grok.py#L208",
      "per": "run",
      "entries": [
        {
          "when": {
            "resolution": "1k",
            "quality": "low"
          },
          "low": 0.07,
          "high": 0.07,
          "approximate": false
        },
        {
          "when": {
            "resolution": "1k",
            "quality": "medium"
          },
          "low": 0.07,
          "high": 0.07,
          "approximate": false
        },
        {
          "when": {
            "resolution": "1k",
            "quality": "high"
          },
          "low": 0.07,
          "high": 0.07,
          "approximate": false
        },
        {
          "when": {
            "resolution": "2k",
            "quality": "low"
          },
          "low": 0.07,
          "high": 0.07,
          "approximate": false
        },
        {
          "when": {
            "resolution": "2k",
            "quality": "medium"
          },
          "low": 0.07,
          "high": 0.07,
          "approximate": false
        },
        {
          "when": {
            "resolution": "2k",
            "quality": "high"
          },
          "low": 0.07,
          "high": 0.07,
          "approximate": false
        }
      ]
    },
    "xai/grok-imagine-image-quality": {
      "node": "GrokImageNode",
      "source": "https://github.com/Comfy-Org/ComfyUI/blob/cdf272f3514353aab04dc2d9fceef57a260dc156/comfy_api_nodes/nodes_grok.py#L208",
      "per": "run",
      "entries": [
        {
          "when": {
            "resolution": "1k",
            "quality": "low"
          },
          "low": 0.05,
          "high": 0.05,
          "approximate": false
        },
        {
          "when": {
            "resolution": "1k",
            "quality": "medium"
          },
          "low": 0.05,
          "high": 0.05,
          "approximate": false
        },
        {
          "when": {
            "resolution": "1k",
            "quality": "high"
          },
          "low": 0.05,
          "high": 0.05,
          "approximate": false
        },
        {
          "when": {
            "resolution": "2k",
            "quality": "low"
          },
          "low": 0.07,
          "high": 0.07,
          "approximate": false
        },
        {
          "when": {
            "resolution": "2k",
            "quality": "medium"
          },
          "low": 0.07,
          "high": 0.07,
          "approximate": false
        },
        {
          "when": {
            "resolution": "2k",
            "quality": "high"
          },
          "low": 0.07,
          "high": 0.07,
          "approximate": false
        }
      ]
    },
    "xai/grok-imagine-video": {
      "node": "GrokVideoNode",
      "source": "https://github.com/Comfy-Org/ComfyUI/blob/cdf272f3514353aab04dc2d9fceef57a260dc156/comfy_api_nodes/nodes_grok.py#L683",
      "per": "run",
      "entries": [
        {
          "when": {
            "duration": 1
          },
          "low": 0.05,
          "high": 0.05,
          "approximate": false
        },
        {
          "when": {
            "duration": 1
          },
          "low": 0.07,
          "high": 0.07,
          "approximate": false
        },
        {
          "when": {
            "duration": 1
          },
          "low": 0.05,
          "high": 0.05,
          "approximate": false
        },
        {
          "when": {
            "duration": 2
          },
          "low": 0.1,
          "high": 0.1,
          "approximate": false
        },
        {
          "when": {
            "duration": 2
          },
          "low": 0.14,
          "high": 0.14,
          "approximate": false
        },
        {
          "when": {
            "duration": 2
          },
          "low": 0.1,
          "high": 0.1,
          "approximate": false
        },
        {
          "when": {
            "duration": 3
          },
          "low": 0.15,
          "high": 0.15,
          "approximate": false
        },
        {
          "when": {
            "duration": 3
          },
          "low": 0.21,
          "high": 0.21,
          "approximate": false
        },
        {
          "when": {
            "duration": 3
          },
          "low": 0.15,
          "high": 0.15,
          "approximate": false
        },
        {
          "when": {
            "duration": 4
          },
          "low": 0.2,
          "high": 0.2,
          "approximate": false
        },
        {
          "when": {
            "duration": 4
          },
          "low": 0.28,
          "high": 0.28,
          "approximate": false
        },
        {
          "when": {
            "duration": 4
          },
          "low": 0.2,
          "high": 0.2,
          "approximate": false
        },
        {
          "when": {
            "duration": 5
          },
          "low": 0.25,
          "high": 0.25,
          "approximate": false
        },
        {
          "when": {
            "duration": 5
          },
          "low": 0.35,
          "high": 0.35,
          "approximate": false
        },
        {
          "when": {
            "duration": 5
          },
          "low": 0.25,
          "high": 0.25,
          "approximate": false
        },
        {
          "when": {
            "duration": 6
          },
          "low": 0.3,
          "high": 0.3,
          "approximate": false
        },
        {
          "when": {
            "duration": 6
          },
          "low": 0.42,
          "high": 0.42,
          "approximate": false
        },
        {
          "when": {
            "duration": 6
          },
          "low": 0.3,
          "high": 0.3,
          "approximate": false
        },
        {
          "when": {
            "duration": 7
          },
          "low": 0.35,
          "high": 0.35,
          "approximate": false
        },
        {
          "when": {
            "duration": 7
          },
          "low": 0.49,
          "high": 0.49,
          "approximate": false
        },
        {
          "when": {
            "duration": 7
          },
          "low": 0.35,
          "high": 0.35,
          "approximate": false
        },
        {
          "when": {
            "duration": 8
          },
          "low": 0.4,
          "high": 0.4,
          "approximate": false
        },
        {
          "when": {
            "duration": 8
          },
          "low": 0.56,
          "high": 0.56,
          "approximate": false
        },
        {
          "when": {
            "duration": 8
          },
          "low": 0.4,
          "high": 0.4,
          "approximate": false
        },
        {
          "when": {
            "duration": 9
          },
          "low": 0.45,
          "high": 0.45,
          "approximate": false
        },
        {
          "when": {
            "duration": 9
          },
          "low": 0.63,
          "high": 0.63,
          "approximate": false
        },
        {
          "when": {
            "duration": 9
          },
          "low": 0.45,
          "high": 0.45,
          "approximate": false
        },
        {
          "when": {
            "duration": 10
          },
          "low": 0.5,
          "high": 0.5,
          "approximate": false
        },
        {
          "when": {
            "duration": 10
          },
          "low": 0.7,
          "high": 0.7,
          "approximate": false
        },
        {
          "when": {
            "duration": 10
          },
          "low": 0.5,
          "high": 0.5,
          "approximate": false
        },
        {
          "when": {
            "duration": 11
          },
          "low": 0.55,
          "high": 0.55,
          "approximate": false
        },
        {
          "when": {
            "duration": 11
          },
          "low": 0.77,
          "high": 0.77,
          "approximate": false
        },
        {
          "when": {
            "duration": 11
          },
          "low": 0.55,
          "high": 0.55,
          "approximate": false
        },
        {
          "when": {
            "duration": 12
          },
          "low": 0.6,
          "high": 0.6,
          "approximate": false
        },
        {
          "when": {
            "duration": 12
          },
          "low": 0.84,
          "high": 0.84,
          "approximate": false
        },
        {
          "when": {
            "duration": 12
          },
          "low": 0.6,
          "high": 0.6,
          "approximate": false
        },
        {
          "when": {
            "duration": 13
          },
          "low": 0.65,
          "high": 0.65,
          "approximate": false
        },
        {
          "when": {
            "duration": 13
          },
          "low": 0.91,
          "high": 0.91,
          "approximate": false
        },
        {
          "when": {
            "duration": 13
          },
          "low": 0.65,
          "high": 0.65,
          "approximate": false
        },
        {
          "when": {
            "duration": 14
          },
          "low": 0.7,
          "high": 0.7,
          "approximate": false
        },
        {
          "when": {
            "duration": 14
          },
          "low": 0.98,
          "high": 0.98,
          "approximate": false
        },
        {
          "when": {
            "duration": 14
          },
          "low": 0.7,
          "high": 0.7,
          "approximate": false
        },
        {
          "when": {
            "duration": 15
          },
          "low": 0.75,
          "high": 0.75,
          "approximate": false
        },
        {
          "when": {
            "duration": 15
          },
          "low": 1.05,
          "high": 1.05,
          "approximate": false
        },
        {
          "when": {
            "duration": 15
          },
          "low": 0.75,
          "high": 0.75,
          "approximate": false
        }
      ]
    },
    "xai/grok-imagine-video-1.5": {
      "node": "GrokVideoNode",
      "source": "https://github.com/Comfy-Org/ComfyUI/blob/cdf272f3514353aab04dc2d9fceef57a260dc156/comfy_api_nodes/nodes_grok.py#L683",
      "per": "run",
      "entries": [
        {
          "when": {
            "duration": 1
          },
          "low": 0.1144,
          "high": 0.1144,
          "approximate": false
        },
        {
          "when": {
            "duration": 1
          },
          "low": 0.2002,
          "high": 0.2002,
          "approximate": false
        },
        {
          "when": {
            "duration": 1
          },
          "low": 0.3575,
          "high": 0.3575,
          "approximate": false
        },
        {
          "when": {
            "duration": 2
          },
          "low": 0.2288,
          "high": 0.2288,
          "approximate": false
        },
        {
          "when": {
            "duration": 2
          },
          "low": 0.4004,
          "high": 0.4004,
          "approximate": false
        },
        {
          "when": {
            "duration": 2
          },
          "low": 0.715,
          "high": 0.715,
          "approximate": false
        },
        {
          "when": {
            "duration": 3
          },
          "low": 0.3432,
          "high": 0.3432,
          "approximate": false
        },
        {
          "when": {
            "duration": 3
          },
          "low": 0.6006,
          "high": 0.6006,
          "approximate": false
        },
        {
          "when": {
            "duration": 3
          },
          "low": 1.0725,
          "high": 1.0725,
          "approximate": false
        },
        {
          "when": {
            "duration": 4
          },
          "low": 0.4576,
          "high": 0.4576,
          "approximate": false
        },
        {
          "when": {
            "duration": 4
          },
          "low": 0.8008,
          "high": 0.8008,
          "approximate": false
        },
        {
          "when": {
            "duration": 4
          },
          "low": 1.43,
          "high": 1.43,
          "approximate": false
        },
        {
          "when": {
            "duration": 5
          },
          "low": 0.572,
          "high": 0.572,
          "approximate": false
        },
        {
          "when": {
            "duration": 5
          },
          "low": 1.001,
          "high": 1.001,
          "approximate": false
        },
        {
          "when": {
            "duration": 5
          },
          "low": 1.7875,
          "high": 1.7875,
          "approximate": false
        },
        {
          "when": {
            "duration": 6
          },
          "low": 0.6864,
          "high": 0.6864,
          "approximate": false
        },
        {
          "when": {
            "duration": 6
          },
          "low": 1.2012,
          "high": 1.2012,
          "approximate": false
        },
        {
          "when": {
            "duration": 6
          },
          "low": 2.145,
          "high": 2.145,
          "approximate": false
        },
        {
          "when": {
            "duration": 7
          },
          "low": 0.8008,
          "high": 0.8008,
          "approximate": false
        },
        {
          "when": {
            "duration": 7
          },
          "low": 1.4014,
          "high": 1.4014,
          "approximate": false
        },
        {
          "when": {
            "duration": 7
          },
          "low": 2.5025,
          "high": 2.5025,
          "approximate": false
        },
        {
          "when": {
            "duration": 8
          },
          "low": 0.9152,
          "high": 0.9152,
          "approximate": false
        },
        {
          "when": {
            "duration": 8
          },
          "low": 1.6016,
          "high": 1.6016,
          "approximate": false
        },
        {
          "when": {
            "duration": 8
          },
          "low": 2.86,
          "high": 2.86,
          "approximate": false
        },
        {
          "when": {
            "duration": 9
          },
          "low": 1.0296,
          "high": 1.0296,
          "approximate": false
        },
        {
          "when": {
            "duration": 9
          },
          "low": 1.8018,
          "high": 1.8018,
          "approximate": false
        },
        {
          "when": {
            "duration": 9
          },
          "low": 3.2175,
          "high": 3.2175,
          "approximate": false
        },
        {
          "when": {
            "duration": 10
          },
          "low": 1.144,
          "high": 1.144,
          "approximate": false
        },
        {
          "when": {
            "duration": 10
          },
          "low": 2.002,
          "high": 2.002,
          "approximate": false
        },
        {
          "when": {
            "duration": 10
          },
          "low": 3.575,
          "high": 3.575,
          "approximate": false
        },
        {
          "when": {
            "duration": 11
          },
          "low": 1.2584,
          "high": 1.2584,
          "approximate": false
        },
        {
          "when": {
            "duration": 11
          },
          "low": 2.2022,
          "high": 2.2022,
          "approximate": false
        },
        {
          "when": {
            "duration": 11
          },
          "low": 3.9325,
          "high": 3.9325,
          "approximate": false
        },
        {
          "when": {
            "duration": 12
          },
          "low": 1.3728,
          "high": 1.3728,
          "approximate": false
        },
        {
          "when": {
            "duration": 12
          },
          "low": 2.4024,
          "high": 2.4024,
          "approximate": false
        },
        {
          "when": {
            "duration": 12
          },
          "low": 4.29,
          "high": 4.29,
          "approximate": false
        },
        {
          "when": {
            "duration": 13
          },
          "low": 1.4872,
          "high": 1.4872,
          "approximate": false
        },
        {
          "when": {
            "duration": 13
          },
          "low": 2.6026,
          "high": 2.6026,
          "approximate": false
        },
        {
          "when": {
            "duration": 13
          },
          "low": 4.6475,
          "high": 4.6475,
          "approximate": false
        },
        {
          "when": {
            "duration": 14
          },
          "low": 1.6016,
          "high": 1.6016,
          "approximate": false
        },
        {
          "when": {
            "duration": 14
          },
          "low": 2.8028,
          "high": 2.8028,
          "approximate": false
        },
        {
          "when": {
            "duration": 14
          },
          "low": 5.005,
          "high": 5.005,
          "approximate": false
        },
        {
          "when": {
            "duration": 15
          },
          "low": 1.716,
          "high": 1.716,
          "approximate": false
        },
        {
          "when": {
            "duration": 15
          },
          "low": 3.003,
          "high": 3.003,
          "approximate": false
        },
        {
          "when": {
            "duration": 15
          },
          "low": 5.3625,
          "high": 5.3625,
          "approximate": false
        }
      ]
    },
    "xai/grok-imagine-video-1.5-lite": {
      "node": "GrokVideoNode",
      "source": "https://github.com/Comfy-Org/ComfyUI/blob/cdf272f3514353aab04dc2d9fceef57a260dc156/comfy_api_nodes/nodes_grok.py#L683",
      "per": "run",
      "entries": [
        {
          "when": {
            "duration": 1
          },
          "low": 0.0286,
          "high": 0.0286,
          "approximate": false
        },
        {
          "when": {
            "duration": 1
          },
          "low": 0.0429,
          "high": 0.0429,
          "approximate": false
        },
        {
          "when": {
            "duration": 1
          },
          "low": 0.2002,
          "high": 0.2002,
          "approximate": false
        },
        {
          "when": {
            "duration": 2
          },
          "low": 0.0572,
          "high": 0.0572,
          "approximate": false
        },
        {
          "when": {
            "duration": 2
          },
          "low": 0.0858,
          "high": 0.0858,
          "approximate": false
        },
        {
          "when": {
            "duration": 2
          },
          "low": 0.4004,
          "high": 0.4004,
          "approximate": false
        },
        {
          "when": {
            "duration": 3
          },
          "low": 0.0858,
          "high": 0.0858,
          "approximate": false
        },
        {
          "when": {
            "duration": 3
          },
          "low": 0.1287,
          "high": 0.1287,
          "approximate": false
        },
        {
          "when": {
            "duration": 3
          },
          "low": 0.6006,
          "high": 0.6006,
          "approximate": false
        },
        {
          "when": {
            "duration": 4
          },
          "low": 0.1144,
          "high": 0.1144,
          "approximate": false
        },
        {
          "when": {
            "duration": 4
          },
          "low": 0.1716,
          "high": 0.1716,
          "approximate": false
        },
        {
          "when": {
            "duration": 4
          },
          "low": 0.8008,
          "high": 0.8008,
          "approximate": false
        },
        {
          "when": {
            "duration": 5
          },
          "low": 0.143,
          "high": 0.143,
          "approximate": false
        },
        {
          "when": {
            "duration": 5
          },
          "low": 0.2145,
          "high": 0.2145,
          "approximate": false
        },
        {
          "when": {
            "duration": 5
          },
          "low": 1.001,
          "high": 1.001,
          "approximate": false
        },
        {
          "when": {
            "duration": 6
          },
          "low": 0.1716,
          "high": 0.1716,
          "approximate": false
        },
        {
          "when": {
            "duration": 6
          },
          "low": 0.2574,
          "high": 0.2574,
          "approximate": false
        },
        {
          "when": {
            "duration": 6
          },
          "low": 1.2012,
          "high": 1.2012,
          "approximate": false
        },
        {
          "when": {
            "duration": 7
          },
          "low": 0.2002,
          "high": 0.2002,
          "approximate": false
        },
        {
          "when": {
            "duration": 7
          },
          "low": 0.3003,
          "high": 0.3003,
          "approximate": false
        },
        {
          "when": {
            "duration": 7
          },
          "low": 1.4014,
          "high": 1.4014,
          "approximate": false
        },
        {
          "when": {
            "duration": 8
          },
          "low": 0.2288,
          "high": 0.2288,
          "approximate": false
        },
        {
          "when": {
            "duration": 8
          },
          "low": 0.3432,
          "high": 0.3432,
          "approximate": false
        },
        {
          "when": {
            "duration": 8
          },
          "low": 1.6016,
          "high": 1.6016,
          "approximate": false
        },
        {
          "when": {
            "duration": 9
          },
          "low": 0.2574,
          "high": 0.2574,
          "approximate": false
        },
        {
          "when": {
            "duration": 9
          },
          "low": 0.3861,
          "high": 0.3861,
          "approximate": false
        },
        {
          "when": {
            "duration": 9
          },
          "low": 1.8018,
          "high": 1.8018,
          "approximate": false
        },
        {
          "when": {
            "duration": 10
          },
          "low": 0.286,
          "high": 0.286,
          "approximate": false
        },
        {
          "when": {
            "duration": 10
          },
          "low": 0.429,
          "high": 0.429,
          "approximate": false
        },
        {
          "when": {
            "duration": 10
          },
          "low": 2.002,
          "high": 2.002,
          "approximate": false
        },
        {
          "when": {
            "duration": 11
          },
          "low": 0.3146,
          "high": 0.3146,
          "approximate": false
        },
        {
          "when": {
            "duration": 11
          },
          "low": 0.4719,
          "high": 0.4719,
          "approximate": false
        },
        {
          "when": {
            "duration": 11
          },
          "low": 2.2022,
          "high": 2.2022,
          "approximate": false
        },
        {
          "when": {
            "duration": 12
          },
          "low": 0.3432,
          "high": 0.3432,
          "approximate": false
        },
        {
          "when": {
            "duration": 12
          },
          "low": 0.5148,
          "high": 0.5148,
          "approximate": false
        },
        {
          "when": {
            "duration": 12
          },
          "low": 2.4024,
          "high": 2.4024,
          "approximate": false
        },
        {
          "when": {
            "duration": 13
          },
          "low": 0.3718,
          "high": 0.3718,
          "approximate": false
        },
        {
          "when": {
            "duration": 13
          },
          "low": 0.5577,
          "high": 0.5577,
          "approximate": false
        },
        {
          "when": {
            "duration": 13
          },
          "low": 2.6026,
          "high": 2.6026,
          "approximate": false
        },
        {
          "when": {
            "duration": 14
          },
          "low": 0.4004,
          "high": 0.4004,
          "approximate": false
        },
        {
          "when": {
            "duration": 14
          },
          "low": 0.6006,
          "high": 0.6006,
          "approximate": false
        },
        {
          "when": {
            "duration": 14
          },
          "low": 2.8028,
          "high": 2.8028,
          "approximate": false
        },
        {
          "when": {
            "duration": 15
          },
          "low": 0.429,
          "high": 0.429,
          "approximate": false
        },
        {
          "when": {
            "duration": 15
          },
          "low": 0.6435,
          "high": 0.6435,
          "approximate": false
        },
        {
          "when": {
            "duration": 15
          },
          "low": 3.003,
          "high": 3.003,
          "approximate": false
        }
      ]
    },
    "xai/grok-imagine-video-1.5-preview": {
      "node": "GrokVideoNode",
      "source": "https://github.com/Comfy-Org/ComfyUI/blob/cdf272f3514353aab04dc2d9fceef57a260dc156/comfy_api_nodes/nodes_grok.py#L683",
      "per": "run",
      "entries": [
        {
          "when": {
            "duration": 1
          },
          "low": 0.1144,
          "high": 0.1144,
          "approximate": false
        },
        {
          "when": {
            "duration": 1
          },
          "low": 0.2002,
          "high": 0.2002,
          "approximate": false
        },
        {
          "when": {
            "duration": 1
          },
          "low": 0.3575,
          "high": 0.3575,
          "approximate": false
        },
        {
          "when": {
            "duration": 2
          },
          "low": 0.2288,
          "high": 0.2288,
          "approximate": false
        },
        {
          "when": {
            "duration": 2
          },
          "low": 0.4004,
          "high": 0.4004,
          "approximate": false
        },
        {
          "when": {
            "duration": 2
          },
          "low": 0.715,
          "high": 0.715,
          "approximate": false
        },
        {
          "when": {
            "duration": 3
          },
          "low": 0.3432,
          "high": 0.3432,
          "approximate": false
        },
        {
          "when": {
            "duration": 3
          },
          "low": 0.6006,
          "high": 0.6006,
          "approximate": false
        },
        {
          "when": {
            "duration": 3
          },
          "low": 1.0725,
          "high": 1.0725,
          "approximate": false
        },
        {
          "when": {
            "duration": 4
          },
          "low": 0.4576,
          "high": 0.4576,
          "approximate": false
        },
        {
          "when": {
            "duration": 4
          },
          "low": 0.8008,
          "high": 0.8008,
          "approximate": false
        },
        {
          "when": {
            "duration": 4
          },
          "low": 1.43,
          "high": 1.43,
          "approximate": false
        },
        {
          "when": {
            "duration": 5
          },
          "low": 0.572,
          "high": 0.572,
          "approximate": false
        },
        {
          "when": {
            "duration": 5
          },
          "low": 1.001,
          "high": 1.001,
          "approximate": false
        },
        {
          "when": {
            "duration": 5
          },
          "low": 1.7875,
          "high": 1.7875,
          "approximate": false
        },
        {
          "when": {
            "duration": 6
          },
          "low": 0.6864,
          "high": 0.6864,
          "approximate": false
        },
        {
          "when": {
            "duration": 6
          },
          "low": 1.2012,
          "high": 1.2012,
          "approximate": false
        },
        {
          "when": {
            "duration": 6
          },
          "low": 2.145,
          "high": 2.145,
          "approximate": false
        },
        {
          "when": {
            "duration": 7
          },
          "low": 0.8008,
          "high": 0.8008,
          "approximate": false
        },
        {
          "when": {
            "duration": 7
          },
          "low": 1.4014,
          "high": 1.4014,
          "approximate": false
        },
        {
          "when": {
            "duration": 7
          },
          "low": 2.5025,
          "high": 2.5025,
          "approximate": false
        },
        {
          "when": {
            "duration": 8
          },
          "low": 0.9152,
          "high": 0.9152,
          "approximate": false
        },
        {
          "when": {
            "duration": 8
          },
          "low": 1.6016,
          "high": 1.6016,
          "approximate": false
        },
        {
          "when": {
            "duration": 8
          },
          "low": 2.86,
          "high": 2.86,
          "approximate": false
        },
        {
          "when": {
            "duration": 9
          },
          "low": 1.0296,
          "high": 1.0296,
          "approximate": false
        },
        {
          "when": {
            "duration": 9
          },
          "low": 1.8018,
          "high": 1.8018,
          "approximate": false
        },
        {
          "when": {
            "duration": 9
          },
          "low": 3.2175,
          "high": 3.2175,
          "approximate": false
        },
        {
          "when": {
            "duration": 10
          },
          "low": 1.144,
          "high": 1.144,
          "approximate": false
        },
        {
          "when": {
            "duration": 10
          },
          "low": 2.002,
          "high": 2.002,
          "approximate": false
        },
        {
          "when": {
            "duration": 10
          },
          "low": 3.575,
          "high": 3.575,
          "approximate": false
        },
        {
          "when": {
            "duration": 11
          },
          "low": 1.2584,
          "high": 1.2584,
          "approximate": false
        },
        {
          "when": {
            "duration": 11
          },
          "low": 2.2022,
          "high": 2.2022,
          "approximate": false
        },
        {
          "when": {
            "duration": 11
          },
          "low": 3.9325,
          "high": 3.9325,
          "approximate": false
        },
        {
          "when": {
            "duration": 12
          },
          "low": 1.3728,
          "high": 1.3728,
          "approximate": false
        },
        {
          "when": {
            "duration": 12
          },
          "low": 2.4024,
          "high": 2.4024,
          "approximate": false
        },
        {
          "when": {
            "duration": 12
          },
          "low": 4.29,
          "high": 4.29,
          "approximate": false
        },
        {
          "when": {
            "duration": 13
          },
          "low": 1.4872,
          "high": 1.4872,
          "approximate": false
        },
        {
          "when": {
            "duration": 13
          },
          "low": 2.6026,
          "high": 2.6026,
          "approximate": false
        },
        {
          "when": {
            "duration": 13
          },
          "low": 4.6475,
          "high": 4.6475,
          "approximate": false
        },
        {
          "when": {
            "duration": 14
          },
          "low": 1.6016,
          "high": 1.6016,
          "approximate": false
        },
        {
          "when": {
            "duration": 14
          },
          "low": 2.8028,
          "high": 2.8028,
          "approximate": false
        },
        {
          "when": {
            "duration": 14
          },
          "low": 5.005,
          "high": 5.005,
          "approximate": false
        },
        {
          "when": {
            "duration": 15
          },
          "low": 1.716,
          "high": 1.716,
          "approximate": false
        },
        {
          "when": {
            "duration": 15
          },
          "low": 3.003,
          "high": 3.003,
          "approximate": false
        },
        {
          "when": {
            "duration": 15
          },
          "low": 5.3625,
          "high": 5.3625,
          "approximate": false
        }
      ]
    },
    "elevenlabs/eleven_multilingual_v2": {
      "node": "ElevenLabsTextToSpeech",
      "source": "https://github.com/Comfy-Org/ComfyUI/blob/cdf272f3514353aab04dc2d9fceef57a260dc156/comfy_api_nodes/nodes_elevenlabs.py#L379",
      "per": "thousand-characters",
      "entries": [
        {
          "when": {},
          "low": 0.24,
          "high": 0.24,
          "approximate": true
        }
      ]
    },
    "elevenlabs/eleven_v3": {
      "node": "ElevenLabsTextToSpeech",
      "source": "https://github.com/Comfy-Org/ComfyUI/blob/cdf272f3514353aab04dc2d9fceef57a260dc156/comfy_api_nodes/nodes_elevenlabs.py#L379",
      "per": "thousand-characters",
      "entries": [
        {
          "when": {},
          "low": 0.24,
          "high": 0.24,
          "approximate": true
        }
      ]
    },
    "elevenlabs/eleven_v4": {
      "node": "ElevenLabsTextToSpeech",
      "source": "https://github.com/Comfy-Org/ComfyUI/blob/cdf272f3514353aab04dc2d9fceef57a260dc156/comfy_api_nodes/nodes_elevenlabs.py#L379",
      "per": "thousand-characters",
      "entries": [
        {
          "when": {},
          "low": 0.1144,
          "high": 0.1144,
          "approximate": true
        }
      ]
    },
    "elevenlabs/eleven_v4_turbo": {
      "node": "ElevenLabsTextToSpeech",
      "source": "https://github.com/Comfy-Org/ComfyUI/blob/cdf272f3514353aab04dc2d9fceef57a260dc156/comfy_api_nodes/nodes_elevenlabs.py#L379",
      "per": "thousand-characters",
      "entries": [
        {
          "when": {},
          "low": 0.0572,
          "high": 0.0572,
          "approximate": true
        }
      ]
    },
    "freepik/ai-image-upscaler-precision-v2": {
      "node": "MagnificImageUpscalerPreciseV2Node",
      "source": "https://github.com/Comfy-Org/ComfyUI/blob/cdf272f3514353aab04dc2d9fceef57a260dc156/comfy_api_nodes/nodes_magnific.py#L266",
      "per": "run",
      "entries": [
        {
          "when": {
            "scalefactor": 2
          },
          "low": 0.172,
          "high": 2.045,
          "approximate": true
        },
        {
          "when": {
            "scalefactor": 4
          },
          "low": 0.343,
          "high": 2.545,
          "approximate": true
        },
        {
          "when": {
            "scalefactor": 8
          },
          "low": 0.515,
          "high": 2.889,
          "approximate": true
        },
        {
          "when": {
            "scalefactor": 16
          },
          "low": 0.844,
          "high": 3.06,
          "approximate": true
        }
      ]
    },
    "ideogram/p-image-ideogram": {
      "node": "IdeogramPImage",
      "source": "https://github.com/Comfy-Org/ComfyUI/blob/cdf272f3514353aab04dc2d9fceef57a260dc156/comfy_api_nodes/nodes_ideogram.py#L678",
      "per": "run",
      "entries": [
        {
          "when": {
            "quality": "VERY_LOW",
            "resolution": "1K"
          },
          "low": 0.00429,
          "high": 0.00429,
          "approximate": false
        },
        {
          "when": {
            "quality": "VERY_LOW",
            "resolution": "2K"
          },
          "low": 0.00858,
          "high": 0.00858,
          "approximate": false
        },
        {
          "when": {
            "quality": "LOW",
            "resolution": "1K"
          },
          "low": 0.010725,
          "high": 0.010725,
          "approximate": false
        },
        {
          "when": {
            "quality": "LOW",
            "resolution": "2K"
          },
          "low": 0.02145,
          "high": 0.02145,
          "approximate": false
        },
        {
          "when": {
            "quality": "MEDIUM",
            "resolution": "1K"
          },
          "low": 0.0143,
          "high": 0.0143,
          "approximate": false
        },
        {
          "when": {
            "quality": "MEDIUM",
            "resolution": "2K"
          },
          "low": 0.0286,
          "high": 0.0286,
          "approximate": false
        },
        {
          "when": {
            "quality": "HIGH",
            "resolution": "1K"
          },
          "low": 0.02145,
          "high": 0.02145,
          "approximate": false
        },
        {
          "when": {
            "quality": "HIGH",
            "resolution": "2K"
          },
          "low": 0.0429,
          "high": 0.0429,
          "approximate": false
        }
      ]
    },
    "kling/kling-v2-6": {
      "node": "KlingTextToVideoWithAudio",
      "source": "https://github.com/Comfy-Org/ComfyUI/blob/cdf272f3514353aab04dc2d9fceef57a260dc156/comfy_api_nodes/nodes_kling.py#L1908",
      "per": "run",
      "entries": [
        {
          "when": {
            "duration": "3",
            "sound": "on"
          },
          "low": 0.42,
          "high": 0.42,
          "approximate": false
        },
        {
          "when": {
            "duration": "3",
            "sound": "off"
          },
          "low": 0.21,
          "high": 0.21,
          "approximate": false
        },
        {
          "when": {
            "duration": "4",
            "sound": "on"
          },
          "low": 0.56,
          "high": 0.56,
          "approximate": false
        },
        {
          "when": {
            "duration": "4",
            "sound": "off"
          },
          "low": 0.28,
          "high": 0.28,
          "approximate": false
        },
        {
          "when": {
            "duration": "5",
            "sound": "on"
          },
          "low": 0.7,
          "high": 0.7,
          "approximate": false
        },
        {
          "when": {
            "duration": "5",
            "sound": "off"
          },
          "low": 0.35,
          "high": 0.35,
          "approximate": false
        },
        {
          "when": {
            "duration": "6",
            "sound": "on"
          },
          "low": 0.84,
          "high": 0.84,
          "approximate": false
        },
        {
          "when": {
            "duration": "6",
            "sound": "off"
          },
          "low": 0.42,
          "high": 0.42,
          "approximate": false
        },
        {
          "when": {
            "duration": "7",
            "sound": "on"
          },
          "low": 0.98,
          "high": 0.98,
          "approximate": false
        },
        {
          "when": {
            "duration": "7",
            "sound": "off"
          },
          "low": 0.49,
          "high": 0.49,
          "approximate": false
        },
        {
          "when": {
            "duration": "8",
            "sound": "on"
          },
          "low": 1.12,
          "high": 1.12,
          "approximate": false
        },
        {
          "when": {
            "duration": "8",
            "sound": "off"
          },
          "low": 0.56,
          "high": 0.56,
          "approximate": false
        },
        {
          "when": {
            "duration": "9",
            "sound": "on"
          },
          "low": 1.26,
          "high": 1.26,
          "approximate": false
        },
        {
          "when": {
            "duration": "9",
            "sound": "off"
          },
          "low": 0.63,
          "high": 0.63,
          "approximate": false
        },
        {
          "when": {
            "duration": "10",
            "sound": "on"
          },
          "low": 1.4,
          "high": 1.4,
          "approximate": false
        },
        {
          "when": {
            "duration": "10",
            "sound": "off"
          },
          "low": 0.7,
          "high": 0.7,
          "approximate": false
        },
        {
          "when": {
            "duration": "11",
            "sound": "on"
          },
          "low": 1.54,
          "high": 1.54,
          "approximate": false
        },
        {
          "when": {
            "duration": "11",
            "sound": "off"
          },
          "low": 0.77,
          "high": 0.77,
          "approximate": false
        },
        {
          "when": {
            "duration": "12",
            "sound": "on"
          },
          "low": 1.68,
          "high": 1.68,
          "approximate": false
        },
        {
          "when": {
            "duration": "12",
            "sound": "off"
          },
          "low": 0.84,
          "high": 0.84,
          "approximate": false
        },
        {
          "when": {
            "duration": "13",
            "sound": "on"
          },
          "low": 1.82,
          "high": 1.82,
          "approximate": false
        },
        {
          "when": {
            "duration": "13",
            "sound": "off"
          },
          "low": 0.91,
          "high": 0.91,
          "approximate": false
        },
        {
          "when": {
            "duration": "14",
            "sound": "on"
          },
          "low": 1.96,
          "high": 1.96,
          "approximate": false
        },
        {
          "when": {
            "duration": "14",
            "sound": "off"
          },
          "low": 0.98,
          "high": 0.98,
          "approximate": false
        },
        {
          "when": {
            "duration": "15",
            "sound": "on"
          },
          "low": 2.1,
          "high": 2.1,
          "approximate": false
        },
        {
          "when": {
            "duration": "15",
            "sound": "off"
          },
          "low": 1.05,
          "high": 1.05,
          "approximate": false
        }
      ]
    }
  }
} as const
