"use client"

import { X, Minus } from "lucide-react"
import { cn } from "@/lib/utils"
import { Composer } from "@/components/composer/composer"
import { useCompose } from "@/app/providers/compose-provider"

const WINDOW_W = 520
const GAP = 12
const SEP = 12

export function ComposeDock() {
  const { windows, minimize, close, focus, activeId } = useCompose()

  const visible = windows.filter(w => !w.minimized)
  const minimized = windows.filter(w => w.minimized)

  const shiftPx = visible.length > 0
    ? visible.length * WINDOW_W + Math.max(0, visible.length - 1) * GAP + SEP
    : 0

  return (
    <>
      {/* Visible windows */}
      <div className="pointer-events-none fixed bottom-3 right-3 z-50 flex gap-3">
        {visible.map((w, idx) => (
          <div
            key={w.id}
            className={cn(
              "pointer-events-auto shadow-2xl border rounded-lg bg-background flex flex-col overflow-hidden",
              "w-[520px] max-w-[95vw] h-[600px] max-h-[80vh]"
            )}
            onMouseDown={() => focus(w.id)}
          >
            <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/50">
              <div className="truncate text-sm font-medium">{w.title}</div>
              <div className="flex items-center gap-1">
                <button
                  aria-label="Minimize"
                  className="p-1 hover:bg-muted rounded"
                  onClick={() => minimize(w.id, true)}
                >
                  <Minus className="h-4 w-4" />
                </button>
                <button
                  aria-label="Close"
                  className="p-1 hover:bg-muted rounded"
                  onClick={() => close(w.id)}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-hidden">
              <Composer
                mode="modal"
                intent={w.intent}
                email={w.email}
                threadId={w.threadId}
                draftId={w.draftId}
                windowId={w.id}
                onSend={() => close(w.id)}
                onCancel={() => close(w.id)}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Minimized bubbles */}
      {minimized.length > 0 && (
        <div 
          className="fixed bottom-1 right-3 z-50 flex gap-2 flex-nowrap transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform"
          style={{ transform: `translateX(-${shiftPx}px)` }}
        >
          {minimized.map(w => (
            <button
              key={w.id}
              className="rounded-full border bg-background px-3 py-1.5 text-xs shadow hover:bg-muted transition-colors max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap"
              onClick={() => minimize(w.id, false)}
              title={w.title}
            >
              {w.title}
            </button>
          ))}
        </div>
      )}
    </>
  )
}
