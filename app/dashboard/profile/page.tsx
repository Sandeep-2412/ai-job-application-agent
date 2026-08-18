import { UserCircleIcon } from "@hugeicons/core-free-icons"

import { BlankPage } from "@/components/dashboard/blank-page"

export default function ProfilePage() {
  return (
    <BlankPage
      title="Profile"
      description="Your candidate profile, skills, and preferences will live here once this page is built out."
      icon={UserCircleIcon}
    />
  )
}
