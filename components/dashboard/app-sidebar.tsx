"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { HugeiconsIcon, type HugeiconsIconProps } from "@hugeicons/react"
import {
  Briefcase01Icon,
  File01Icon,
  UserCircleIcon,
  TaskDone01Icon,
  Wallet02Icon,
  Settings02Icon,
  SparklesIcon,
  Coins02Icon,
  UnfoldMoreIcon,
  Logout03Icon,
} from "@hugeicons/core-free-icons"

import { createClient } from "@/lib/supabase/client"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Progress } from "@/components/ui/progress"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

const navItems: {
  title: string
  href: string
  icon: HugeiconsIconProps["icon"]
}[] = [
  { title: "Jobs", href: "/dashboard/jobs", icon: Briefcase01Icon },
  { title: "Resume", href: "/dashboard/resume", icon: File01Icon },
  { title: "Profile", href: "/dashboard/profile", icon: UserCircleIcon },
  {
    title: "Application Status",
    href: "/dashboard/application-status",
    icon: TaskDone01Icon,
  },
]

const footerLinks: {
  title: string
  href: string
  icon: HugeiconsIconProps["icon"]
}[] = [
  { title: "Billing / Credits", href: "/dashboard/billing", icon: Wallet02Icon },
  { title: "Profile Settings", href: "/dashboard/settings", icon: Settings02Icon },
]

type AppSidebarUser = {
  name: string
  email: string
  avatarUrl: string | null
}

export function AppSidebar({ user }: { user: AppSidebarUser }) {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-2.5 px-1 py-1.5 group-data-[collapsible=icon]:gap-1 group-data-[collapsible=icon]:px-0">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground group-data-[collapsible=icon]:size-8!">
                <HugeiconsIcon
                  icon={SparklesIcon}
                  strokeWidth={2}
                  className="size-5 group-data-[collapsible=icon]:size-4!"
                />
              </div>
              <div className="flex min-w-0 flex-1 flex-col leading-none group-data-[collapsible=icon]:hidden">
                <span className="truncate text-base font-semibold">JobBuddy AI</span>
                <span className="truncate text-xs text-muted-foreground">
                  Job search, handled
                </span>
              </div>
              <SidebarTrigger className="ml-auto shrink-0 group-data-[collapsible=icon]:ml-0" />
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              {navItems.map((item) => {
                const isActive = pathname?.startsWith(item.href)
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      isActive={isActive}
                      tooltip={item.title}
                      size="lg"
                      className="gap-3 px-3 text-sm font-medium [&_svg]:size-5! hover:bg-primary/15 hover:text-primary"
                    >
                      <HugeiconsIcon icon={item.icon} strokeWidth={2} />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <CreditsDisplay used={128} total={500} />

        <SidebarSeparator />

        <SidebarMenu className="gap-1.5">
          {footerLinks.map((item) => {
            const isActive = pathname?.startsWith(item.href)
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  render={<Link href={item.href} />}
                  isActive={isActive}
                  tooltip={item.title}
                  size="lg"
                  className="gap-3 px-3 text-sm font-medium [&_svg]:size-5! hover:bg-primary/15 hover:text-primary"
                >
                  <HugeiconsIcon icon={item.icon} strokeWidth={2} />
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>

        <SidebarSeparator />

        <NavUser user={user} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}

function CreditsDisplay({ used, total }: { used: number; total: number }) {
  const { state } = useSidebar()
  const remaining = Math.max(total - used, 0)
  const percent = Math.min(Math.round((used / total) * 100), 100)

  if (state === "collapsed") {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <div className="mx-auto flex size-9 items-center justify-center rounded-md bg-sidebar-accent text-sidebar-accent-foreground">
              <HugeiconsIcon icon={Coins02Icon} strokeWidth={2} className="size-5" />
            </div>
          }
        />
        <TooltipContent side="right">
          {remaining} of {total} credits left
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg bg-sidebar-accent/60 p-3">
      <div className="flex items-center gap-1.5 text-sm font-medium text-sidebar-foreground">
        <HugeiconsIcon icon={Coins02Icon} strokeWidth={2} className="size-4 text-muted-foreground" />
        Credits
      </div>
      <Progress value={percent} className="gap-0" />
      <p className="text-xs text-muted-foreground">
        {used.toLocaleString()} / {total.toLocaleString()} used this month
      </p>
    </div>
  )
}

function NavUser({ user }: { user: AppSidebarUser }) {
  const router = useRouter()
  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/sign-in")
    router.refresh()
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton size="lg" className="gap-2.5 px-3">
                <Avatar size="default" className="size-8">
                  {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt={user.name} /> : null}
                  <AvatarFallback>{initials || "U"}</AvatarFallback>
                </Avatar>
                <div className="flex min-w-0 flex-1 flex-col leading-tight">
                  <span className="truncate text-sm font-medium">{user.name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {user.email}
                  </span>
                </div>
                <HugeiconsIcon
                  icon={UnfoldMoreIcon}
                  strokeWidth={2}
                  className="ml-auto size-4 shrink-0 text-muted-foreground"
                />
              </SidebarMenuButton>
            }
          />
          <DropdownMenuContent side="top" align="end" className="w-56">
            <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href="/dashboard/settings" />}>
              <HugeiconsIcon icon={Settings02Icon} strokeWidth={2} />
              Profile Settings
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/dashboard/billing" />}>
              <HugeiconsIcon icon={Wallet02Icon} strokeWidth={2} />
              Billing / Credits
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={handleSignOut}>
              <HugeiconsIcon icon={Logout03Icon} strokeWidth={2} />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
