"use client"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Star, Archive, Trash2, MoreHorizontal, Send } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Email } from "@/app/sent/page"

interface SentListProps {
  emails: Email[]
  selectedEmail: Email | null
  onSelectEmail: (email: Email) => void
  onToggleStar: (id: string) => void
  onToggleArchive: (id: string) => void
  onToggleTrash: (id: string) => void
}

export function SentList({ emails, selectedEmail, onSelectEmail, onToggleStar, onToggleArchive, onToggleTrash }: SentListProps) {
  return (
    <div className="w-full lg:w-96 border-r border-border bg-background flex flex-col">
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Sent</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{emails.length} sent</p>
        </div>
        <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
        if (selectedEmail) {
            onToggleTrash(selectedEmail.id)
          }
        }} disabled={!selectedEmail}>
          <Trash2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Separator />

      {/* Sent email list */}
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
              "group w-full text-left p-4 border-b border-border hover:bg-accent/50 transition-colors",
              selectedEmail?.id === email.id && "bg-accent",
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
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleArchive(email.id)
                }}
                className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
                type="button"
                title="Archive"
              >
                <Archive className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-sm truncate">To: {email.to || "Unknown"}</span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{email.time}</span>
                </div>
                <p className="text-sm truncate mb-1">{email.subject}</p>
                <p className="text-xs text-muted-foreground truncate">{email.preview}</p>
              </div>
            </div>
          </div>
        ))}
        {emails.length === 0 && (
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            <div className="text-center">
              <Send className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No sent emails</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
