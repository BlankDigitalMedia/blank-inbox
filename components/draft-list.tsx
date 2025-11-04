"use client"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Trash2, MoreHorizontal } from "lucide-react"
import { SharedEmailListItem } from "@/components/shared/email-list-item"
import type { Email } from "@/lib/types"
import { Ref } from "react"

interface DraftListProps {
  emails: Email[]
  selectedEmail: Email | null
  onSelectEmail: (email: Email) => void
  onToggleStar: (id: string) => void
  onToggleArchive: (id: string) => void
  onDeleteDraft: (id: string) => void
  scrollRef?: Ref<HTMLDivElement>
}

export function DraftList({ emails, selectedEmail, onSelectEmail, onToggleStar, onToggleArchive, onDeleteDraft, scrollRef }: DraftListProps) {
  return (
    <div className="w-full lg:w-96 border-r border-border bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Drafts</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{emails.length} drafts</p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Separator />

      {/* Draft email list */}
      <div className="flex-1 overflow-y-auto" ref={scrollRef}>
        {emails.map((email) => (
          <SharedEmailListItem
            key={email.id}
            email={email}
            isSelected={selectedEmail?.id === email.id}
            onClick={() => onSelectEmail(email)}
            onToggleStar={onToggleStar}
            onToggleArchive={onToggleArchive}
            onDeleteDraft={onDeleteDraft}
            showArchiveButton={true}
            showDeleteButton={true}
            useReadStyling={false}
          />
        ))}
        {emails.length === 0 && (
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            <div className="text-center">
              <p className="text-sm">No drafts</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
