import { TaskDone01Icon } from "@hugeicons/core-free-icons"

import { BlankPage } from "@/components/dashboard/blank-page"

export default function ApplicationStatusPage() {
  return (
    <BlankPage
      title="Application Status"
      description="Track where every application stands, from submitted to offer, once this page is built out."
      icon={TaskDone01Icon}
    />
  )
}
