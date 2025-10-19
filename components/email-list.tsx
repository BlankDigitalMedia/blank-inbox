"use client"

import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import { Separator } from "@/components/ui/separator"
import { Star, Archive, Trash2, MoreHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Email } from "@/components/email-page"

interface EmailListProps {
  title: string
  countText: string
  emails: Email[]
  selectedEmail: Email | null
  onSelectEmail: (email: Email) => void
  onToggleStar: (id: string) => void
  onToggleArchive?: (id: string) => void
  onToggleTrash?: (id: string) => void
  showArchiveButton?: boolean
  showTrashButton?: boolean
}

export function EmailList({
  title,
  countText,
  emails,
  selectedEmail,
  onSelectEmail,
  onToggleStar,
  onToggleArchive,
  onToggleTrash,
  showArchiveButton = true,
  showTrashButton = true,
}: EmailListProps) {
  return (
    <div className="w-full lg:w-96 border-r border-border bg-background flex flex-col">
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{countText}</p>
        </div>
        <ButtonGroup>
        {showArchiveButton && onToggleArchive && (
        <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => {
        if (selectedEmail && onToggleArchive) {
        onToggleArchive(selectedEmail.id)
        }
        }}
        disabled={!selectedEmail}
        >
        <Archive className="h-4 w-4" />
        </Button>
        )}
        {showTrashButton && onToggleTrash && (
        <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => {
        if (selectedEmail && onToggleTrash) {
        onToggleTrash(selectedEmail.id)
        }
        }}
        disabled={!selectedEmail}
        >
        <Trash2 className="h-4 w-4" />
        </Button>
        )}
        <Button variant="ghost" size="icon" className="h-8 w-8">
        <MoreHorizontal className="h-4 w-4" />
        </Button>
        </ButtonGroup>
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
              "group w-full text-left p-4 border-b border-border hover:bg-accent/50 transition-colors",
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
              {showArchiveButton && onToggleArchive && (
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
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className={cn("text-sm font-medium truncate", !email.read && "font-semibold")}>
                    {email.from}
                  </p>
                  <span className="text-xs text-muted-foreground shrink-0">{email.time}</span>
                </div>
                <h3 className={cn("text-sm truncate mb-1", !email.read && "font-medium")}>{email.subject}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2">{email.preview}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
