import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.12),transparent_45%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.12),transparent_40%)]" />

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8">
        <header className="flex items-center justify-between">
          <div className="inline-flex items-center gap-2 font-medium">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-sm text-primary-foreground">
              AI
            </span>
            Job Application Agent
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              className="h-9"
              nativeButton={false}
              render={<Link href="/sign-in" />}
            >
              Sign in
            </Button>
            <Button
              className="h-9"
              nativeButton={false}
              render={<Link href="/sign-up" />}
            >
              Get started
            </Button>
          </div>
        </header>

        <main className="flex flex-1 flex-col items-center justify-center py-16 text-center">
          <div className="max-w-3xl space-y-6">
            <p className="inline-flex rounded-full border bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur-sm">
              Supabase auth · Dashboard protected · Google sign-in ready
            </p>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Manage your job search with clarity and AI support
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Create an account to access your dashboard, track applications,
              and keep every opportunity organized in one place.
            </p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                size="lg"
                className="h-11 px-6"
                nativeButton={false}
                render={<Link href="/sign-up" />}
              >
                Create free account
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-11 px-6"
                nativeButton={false}
                render={<Link href="/sign-in" />}
              >
                Sign in to dashboard
              </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
