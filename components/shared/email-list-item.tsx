"use client"

import { Star, Archive, Trash2 } from "lucide-react"
import { cn, stripHtml } from "@/lib/utils"
import type { Email } from "@/lib/types"

interface SharedEmailListItemProps {
  email: Email
  isSelected: boolean
  onClick: () => void
  onToggleStar: (id: string) => void
  onToggleArchive?: (id: string) => void
  onToggleTrash?: (id: string) => void
  onDeleteDraft?: (id: string) => void
  showArchiveButton?: boolean
  showTrashButton?: boolean
  showDeleteButton?: boolean
  useReadStyling?: boolean
}

export function SharedEmailListItem({
  email,
  isSelected,
  onClick,
  onToggleStar,
  onToggleArchive,
  onToggleTrash,
  onDeleteDraft,
  showArchiveButton = true,
  showTrashButton = true,
  showDeleteButton = false,
  useReadStyling = true,
}: SharedEmailListItemProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onClick()
        }
      }}
      className={cn(
        "group w-full text-left p-4 border-b border-border hover:bg-accent/50 transition-colors",
        isSelected && "bg-accent",
        useReadStyling && !email.read && "bg-muted/30",
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
          aria-label={email.starred ? "Unstar email" : "Star email"}
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
            aria-label={email.archived ? "Unarchive email" : "Archive email"}
          >
            <Archive className="h-4 w-4 text-muted-foreground hover:text-foreground" />
          </button>
        )}
        {showDeleteButton && onDeleteDraft && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDeleteDraft(email.id)
            }}
            className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
            type="button"
            title="Delete Draft"
            aria-label="Delete draft"
          >
            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-foreground" />
          </button>
        )}
        {showTrashButton && onToggleTrash && !showDeleteButton && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggleTrash(email.id)
            }}
            className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
            type="button"
            title="Trash"
            aria-label={email.trashed ? "Restore from trash" : "Move to trash"}
          >
            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-foreground" />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
          <p className={cn("text-sm font-medium truncate", isSelected && "text-accent-foreground", useReadStyling && !email.read && "font-semibold")}>
          {email.from}
          </p>
          <span className={cn("text-xs text-muted-foreground shrink-0", isSelected && "text-accent-foreground")}>{email.time}</span>
          </div>
          <div className="flex items-center gap-2 mb-1">
          <h3 className={cn("text-sm truncate", isSelected && "text-accent-foreground", useReadStyling && !email.read && "font-medium")}>{email.subject}</h3>
          {email.threadCount > 1 && (
          <span className={cn("text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded shrink-0", isSelected && "bg-accent-foreground/20 text-accent-foreground")}>
          {email.threadCount}
          </span>
          )}
          </div>
          <p className={cn("text-xs text-muted-foreground line-clamp-2", isSelected && "text-accent-foreground")}>{stripHtml(email.preview)}</p>
        </div>
      </div>
    </div>
  )
}
