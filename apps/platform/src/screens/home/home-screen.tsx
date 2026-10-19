import { Button } from "@rosesfield/ui/components/button"
import { StateView } from "@rosesfield/ui/components/state-view"
import { Link } from "@tanstack/react-router"
import type { ReactElement } from "react"
import { t } from "@/copy/t"
import { HomeComposer } from "@/screens/home/home-composer"
import { HomeLibrary, useHomeIsEmpty } from "@/screens/home/home-library"
import { ScreenHeader } from "@/shell/screen-header"

function HomeEmpty(): ReactElement {
  return (
    <StateView
      kind="empty"
      density="compact"
      title={t("home.empty.title")}
      body={t("home.empty.body")}
      className="mx-auto w-full max-w-prompt-max items-center text-center"
      actions={
        <Button
          tone="primary"
          render={<Link to="/apps" />}
          nativeButton={false}
        >
          {t("home.empty.action")}
        </Button>
      }
    />
  )
}

export function HomeScreen(): ReactElement {
  const isEmpty = useHomeIsEmpty()
  return (
    <div className="flex min-h-full flex-col">
      <ScreenHeader title={t("shell.nav.home")} phoneTitle={t("shell.name")} />
      <div className="flex flex-1 flex-col items-center gap-s8 px-s5 @regular:px-s4 @regular:pt-[calc(100dvh/6)] @regular:pb-s12">
        <h2
          className={
            isEmpty
              ? "pt-s12 text-center text-display @regular:pt-0"
              : "hidden text-center text-display @regular:block"
          }
        >
          {t("home.title")}
        </h2>
        <div className="sticky bottom-0 z-10 order-last mt-auto flex w-full justify-center bg-canvas pt-s3 pb-s5 @regular:static @regular:order-none @regular:mt-0 @regular:p-0">
          <HomeComposer />
        </div>
        {isEmpty ? <HomeEmpty /> : <HomeLibrary />}
      </div>
    </div>
  )
}
