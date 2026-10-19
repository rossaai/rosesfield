import { Accordion } from "@base-ui/react/accordion"
import { cn } from "@rosesfield/ui/lib/cn"
import { motion } from "@rosesfield/ui/motion"
import { ChevronDownIcon } from "lucide-react"
import type { ReactElement } from "react"

type AccordionEntry = {
  key: string
  title: string
  body: string
}

export function AccordionList({
  entries,
}: {
  entries: readonly AccordionEntry[]
}): ReactElement {
  return (
    <Accordion.Root className="flex w-full max-w-prose-max flex-col">
      {entries.map((entry) => (
        <Accordion.Item key={entry.key} className="border-b border-(--line)">
          <Accordion.Header>
            <Accordion.Trigger
              className={cn(
                "group flex min-h-button w-full items-center justify-between gap-s3 py-s3 text-left text-body font-medium [&_svg]:glyph",
                motion.tint
              )}
            >
              {entry.title}
              <ChevronDownIcon
                aria-hidden="true"
                className={cn(
                  "text-ink-muted group-data-[panel-open]:rotate-180",
                  motion.control
                )}
              />
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Panel className="pb-s3 text-body text-ink-muted">
            {entry.body}
          </Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  )
}
