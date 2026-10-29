import type { AppListing } from "@rosesfield/contract"
import { PresetTile } from "@rosesfield/ui/components/preset-tile"
import { useNavigate, useRouter } from "@tanstack/react-router"
import type { ReactElement } from "react"
import type { AppExample } from "@/catalog/app-examples"
import { t } from "@/copy/t"
import { useInAppLinks } from "@/screens/explore/in-app-links"

function ExampleTile({
  app,
  example,
}: {
  app: AppListing
  example: AppExample
}): ReactElement {
  const navigate = useNavigate()
  const router = useRouter()
  const target = {
    to: "/apps/$appId",
    params: { appId: app.id },
    search: { example: example.id },
  } as const
  const href = router.buildLocation(target).href
  const remix = (): void => {
    void navigate(target)
  }
  return (
    <PresetTile
      name={example.name}
      line={example.need}
      href={href}
      viewLabel={t("app.library.remixName", { name: example.name })}
      action={{ label: t("app.library.remix"), href, onSelect: remix }}
      clip={{ src: example.src, alt: example.name }}
      aspect={example.aspect}
    />
  )
}

export function AppLibrary({
  app,
  examples,
}: {
  app: AppListing
  examples: readonly AppExample[]
}): ReactElement {
  const links = useInAppLinks<HTMLUListElement>()
  return (
    <ul
      ref={links}
      data-slot="app-library"
      aria-label={t("app.library.label")}
      className="grid grid-cols-2 items-start gap-s3 p-s1 @regular:grid-cols-[repeat(auto-fill,minmax(--spacing(57),1fr))]"
    >
      {examples.map((example) => (
        <li key={example.id} className="flex min-w-0">
          <ExampleTile app={app} example={example} />
        </li>
      ))}
    </ul>
  )
}
