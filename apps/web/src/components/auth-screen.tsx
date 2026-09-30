import { Text } from "@repo/ui"
import type { ReactNode } from "react"
import { GtmNoScript, SignupCompleteWatcher } from "../lib/analytics/signup-complete-watcher.tsx"
import { VigiaBrand } from "./vigia-brand.tsx"

export function AuthScreen({
  title,
  description,
  children,
  visual,
}: {
  readonly title?: string
  readonly description?: string
  readonly children: ReactNode
  readonly visual?: ReactNode
}) {
  const content = (
    <div className="flex flex-col gap-y-6 max-w-[22rem] w-full">
      <div className="flex flex-col items-center justify-center gap-y-6">
        <VigiaBrand />
        {title || description ? (
          <div className="flex flex-col items-center justify-center gap-y-2">
            {title ? <Text.H3 align="center">{title}</Text.H3> : null}
            {description ? (
              <Text.H5 color="foregroundMuted" align="center">
                {description}
              </Text.H5>
            ) : null}
          </div>
        ) : null}
      </div>
      {children}
    </div>
  )

  if (!visual) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
        <GtmNoScript />
        <SignupCompleteWatcher />
        {content}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <GtmNoScript />
      <SignupCompleteWatcher />
      <div className="grid min-h-screen lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <main className="flex items-center justify-center px-5 py-10 sm:px-8 lg:px-12">{content}</main>
        <aside className="relative hidden min-h-screen overflow-hidden border-l border-border bg-[#120b17] lg:flex">
          {visual}
        </aside>
      </div>
    </div>
  )
}
