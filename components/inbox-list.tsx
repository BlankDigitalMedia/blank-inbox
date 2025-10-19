"use client"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Star, Archive, Trash2, MoreHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Email } from "@/components/inbox-view"

interface InboxListProps {
  emails: Email[]
  selectedEmail: Email | null
  onSelectEmail: (email: Email) => void
  onToggleStar: (id: string) => void
}

export function InboxList({ emails, selectedEmail, onSelectEmail, onToggleStar }: InboxListProps) {
  return (
    <div className="w-full lg:w-96 border-r border-border bg-background flex flex-col">
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Inbox</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{emails.filter((e) => !e.read).length} unread</p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Archive className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Separator />

      {/* Email list */}
      <div className="flex-1 overflow-y-auto">
        {emails.map((email) => (
          <div
            key={email.id}
            role="button"
            tabIndex={0}
            onClick={() => onSelectEmail(email)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                onSelectEmail(email)
              }
            }}
            className={cn(
              "w-full text-left p-4 border-b border-border hover:bg-accent/50 transition-colors",
              selectedEmail?.id === email.id && "bg-accent",
              !email.read && "bg-muted/30",
            )}
          >
            <div className="flex items-start gap-3">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleStar(email.id)
                }}
                className="mt-1"
                type="button"
              >
                <Star
                  className={cn(
                    "h-4 w-4 transition-colors",
                    email.starred ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground hover:text-foreground",
                  )}
                />
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className={cn("text-sm truncate", !email.read && "font-semibold")}>{email.from}</span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{email.time}</span>
                </div>
                <p className={cn("text-sm truncate mb-1", !email.read && "font-medium")}>{email.subject}</p>
                <p className="text-xs text-muted-foreground truncate">{email.preview}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
