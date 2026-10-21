const threeDCopy = {
  "threeD.tabs.label": "Make a 3D model",
  "threeD.tab.image": "From an image",
  "threeD.tab.text": "From text",
  "threeD.viewer.label":
    "3D model. Drag to turn it. Scroll, pinch or press plus and minus to zoom.",
  "threeD.viewer.hint": "Drag to turn. Scroll or pinch to zoom.",
  "threeD.viewer.failed": "This model did not open in the viewer",
  "threeD.viewer.noDrawing": "This browser does not draw 3D models",
  "threeD.viewer.download":
    "Download the GLB file to open it in another 3D viewer.",
} satisfies Record<string, string>

export type ThreeDKey = keyof typeof threeDCopy

export function tThreeD(key: ThreeDKey): string {
  return threeDCopy[key]
}
