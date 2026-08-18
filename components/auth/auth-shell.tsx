import Link from "next/link"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

type AuthShellProps = {
  title: string
  subtitle: string
  children: ReactNode
}

export function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className="grid min-h-screen lg:grid-cols-2">
        <aside className="relative hidden overflow-hidden bg-zinc-950 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.35),transparent_55%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.25),transparent_50%)]" />
          <div className="relative z-10 flex flex-col gap-8 p-10 xl:p-14">
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium">
              <span className="flex size-8 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15">
                AI
              </span>
              Job Application Agent
            </Link>
            <div className="max-w-md space-y-4">
              <h1 className="text-3xl font-semibold tracking-tight xl:text-4xl">
                {title}
              </h1>
              <p className="text-sm leading-7 text-zinc-300">{subtitle}</p>
            </div>
          </div>
          <div className="relative z-10 border-t border-white/10 p-10 xl:p-14">
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { label: "Track", value: "Every application" },
                { label: "Organize", value: "One dashboard" },
                { label: "Apply", value: "With AI help" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
                >
                  <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">
                    {item.label}
                  </p>
                  <p className="mt-2 text-sm font-medium text-white">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <main className="flex items-center justify-center px-6 py-10 sm:px-10">
          <div className={cn("w-full max-w-md")}>
            <div className="mb-8 lg:hidden">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm font-medium"
              >
                <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  AI
                </span>
                Job Application Agent
              </Link>
            </div>
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
