"use client"

import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import { Separator } from "@/components/ui/separator"
import { Star, Archive, Trash2, MoreHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"
import { SharedEmailListItem } from "@/components/shared/email-list-item"
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
    <div className="w-full lg:w-96 border-r border-border bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 flex items-center justify-between flex-shrink-0 sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
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

      {/* Email list */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {emails.map((email) => (
          <SharedEmailListItem
            key={email.id}
            email={email}
            isSelected={selectedEmail?.id === email.id}
            onClick={() => onSelectEmail(email)}
            onToggleStar={onToggleStar}
            onToggleArchive={onToggleArchive}
            onToggleTrash={onToggleTrash}
            showArchiveButton={showArchiveButton}
            showTrashButton={showTrashButton}
            useReadStyling={true}
          />
        ))}
      </div>
    </div>
  )
}
