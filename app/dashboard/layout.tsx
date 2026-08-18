import type { CSSProperties } from "react"
import { redirect } from "next/navigation"

import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { createClient } from "@/lib/supabase/server"

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims

  if (!claims?.sub) {
    redirect("/sign-in")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, avatar_url")
    .eq("id", claims.sub)
    .maybeSingle()

  const email =
    profile?.email || (typeof claims.email === "string" ? claims.email : "")
  const name = profile?.full_name || email.split("@")[0] || "there"

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "17.5rem",
          "--sidebar-width-icon": "5rem",
        } as CSSProperties
      }
    >
      <AppSidebar
        user={{
          name,
          email,
          avatarUrl: profile?.avatar_url ?? null,
        }}
      />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur-sm md:hidden">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-4" />
          <span className="text-sm font-medium">JobBuddy AI</span>
        </header>
        <main className="flex flex-1 flex-col">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
