import { HugeiconsIcon, type HugeiconsIconProps } from "@hugeicons/react"

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

export function BlankPage({
  title,
  description,
  icon,
}: {
  title: string
  description: string
  icon: HugeiconsIconProps["icon"]
}) {
  return (
    <div className="flex flex-1 flex-col p-4 md:p-6">
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      </div>
      <Empty className="flex-1 border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <HugeiconsIcon icon={icon} strokeWidth={2} />
          </EmptyMedia>
          <EmptyTitle>{title}</EmptyTitle>
          <EmptyDescription>{description}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  )
}
