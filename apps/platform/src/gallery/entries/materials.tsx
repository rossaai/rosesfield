import type { ReactElement } from "react"
import { type GalleryKey, t } from "@/gallery/copy.en"
import demoSquare from "@/gallery/fixtures/demo-image-1-1.png"
import type { GalleryEntry } from "@/gallery/gallery-entry"

const thicknesses: { utility: string; label: GalleryKey }[] = [
  { utility: "material-thin", label: "sample.material.thin" },
  { utility: "material", label: "sample.material.regular" },
  { utility: "material-thick", label: "sample.material.thick" },
]

function Materials(): ReactElement {
  return (
    <div
      className="relative grid grid-cols-3 gap-s3 overflow-hidden rounded-card bg-center bg-cover p-s6"
      style={{ backgroundImage: `url(${demoSquare})` }}
    >
      {thicknesses.map(({ utility, label }) => (
        <div
          key={utility}
          data-material={utility}
          className={`${utility} flex h-field items-center justify-center rounded-cell text-label text-ink shadow-float`}
        >
          {t(label)}
        </div>
      ))}
    </div>
  )
}

export const materialEntry: GalleryEntry = {
  id: "material",
  title: "entry.material",
  states: [
    {
      id: "thicknesses",
      label: "state.thicknesses",
      render: () => <Materials />,
    },
  ],
}
