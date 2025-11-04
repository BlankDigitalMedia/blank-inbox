"use client"

import { SharedEmailListItem } from "@/components/shared/email-list-item"
import type { Email } from "@/lib/types"
import { Ref } from "react"

interface EmailListProps {
  emails: Email[]
  selectedEmail: Email | null
  onSelectEmail: (email: Email) => void
  onToggleStar: (id: string) => void
  onToggleArchive?: (id: string) => void
  onToggleTrash?: (id: string) => void
  showArchiveButton?: boolean
  showTrashButton?: boolean
  scrollRef?: Ref<HTMLDivElement>
}

export function EmailList({
  emails,
  selectedEmail,
  onSelectEmail,
  onToggleStar,
  onToggleArchive,
  onToggleTrash,
  showArchiveButton = true,
  showTrashButton = true,
  scrollRef,
}: EmailListProps) {
  return (
    <div className="w-full lg:w-96 border-r border-border bg-background flex flex-col overflow-hidden">
      {/* Email list */}
      <div className="flex-1 min-h-0 overflow-y-auto" ref={scrollRef}>
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
