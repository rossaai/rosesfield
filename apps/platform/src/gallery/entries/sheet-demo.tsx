import { Button } from "@rosesfield/ui/components/button"
import { Field, FieldCaption, FieldNote } from "@rosesfield/ui/components/field"
import { SegmentedControl } from "@rosesfield/ui/components/segmented-control"
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@rosesfield/ui/components/sheet"
import { SidebarProvider } from "@rosesfield/ui/components/sidebar"
import { type ReactElement, useState } from "react"
import { t } from "@/gallery/copy.en"
import { NavSidebar } from "@/gallery/entries/nav-sidebar"

type SheetDemoProps = {
  open?: "bottom" | "left"
}

function InputsSheet({ open }: { open: boolean }): ReactElement {
  const [quality, setQuality] = useState("draft")
  return (
    <Sheet defaultOpen={open}>
      <SheetTrigger render={<Button />}>{t("sample.sheet.title")}</SheetTrigger>
      <SheetContent side="bottom" closeLabel={t("sample.close")}>
        <SheetHeader>
          <SheetTitle>{t("sample.sheet.title")}</SheetTitle>
        </SheetHeader>
        <Field>
          <FieldCaption>{t("sample.quality")}</FieldCaption>
          <SegmentedControl
            label={t("sample.quality")}
            value={quality}
            onValueChange={setQuality}
            items={[
              { value: "draft", label: t("sample.quality.draft") },
              { value: "final", label: t("sample.quality.final") },
            ]}
          />
          <FieldNote>{t("sample.price.demo")}</FieldNote>
        </Field>
        <SheetFooter>
          <Button tone="primary" className="max-w-none">
            {t("sample.generate")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

function MenuSheet({ open }: { open: boolean }): ReactElement {
  const [isOpen, setOpen] = useState(open)
  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
      <SheetTrigger render={<Button />}>{t("sample.menuOpen")}</SheetTrigger>
      <SheetContent side="left" aria-label={t("sample.menuOpen")}>
        <SheetTitle className="sr-only">{t("sample.menuOpen")}</SheetTitle>
        <SidebarProvider
          mode="sheet"
          width="full"
          closeLabel={t("sample.menuClose")}
          onNavigate={() => setOpen(false)}
        >
          <NavSidebar />
        </SidebarProvider>
      </SheetContent>
    </Sheet>
  )
}

export function SheetDemo({ open }: SheetDemoProps): ReactElement {
  return (
    <div className="flex flex-wrap gap-s2">
      <InputsSheet open={open === "bottom"} />
      <MenuSheet open={open === "left"} />
    </div>
  )
}
