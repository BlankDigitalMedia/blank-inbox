"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import type { Id } from "@/convex/_generated/dataModel"

interface Contact {
  _id: Id<"contacts">
  primaryEmail: string
  name?: string
  company?: string
  title?: string
  lastContactedAt?: number
  tags?: string[]
}

interface ContactListProps {
  contacts: Contact[]
  selectedContactId: Id<"contacts"> | null
  onSelectContact: (id: Id<"contacts"> | null) => void
}

export function ContactList({
  contacts,
  selectedContactId,
  onSelectContact,
}: ContactListProps) {
  const getInitials = (contact: Contact) => {
    if (contact.name) {
      const parts = contact.name.trim().split(/\s+/).filter(Boolean).slice(0, 2)
      const initials = parts.map((part) => part[0] ?? "").join("")
      if (initials) return initials.toUpperCase()
    }
    const firstChar = contact.primaryEmail[0]
    return firstChar ? firstChar.toUpperCase() : "?"
  }

  const formatLastContacted = (timestamp?: number) => {
    if (!timestamp) return null
    const date = new Date(timestamp)
    const now = Date.now()
    const diffMs = now - timestamp
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return "Today"
    if (diffDays === 1) return "Yesterday"
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    return date.toLocaleDateString()
  }

  if (contacts.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <p className="text-sm">No contacts found</p>
      </div>
    )
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      {contacts.map((contact) => {
        const isSelected = selectedContactId === contact._id
        return (
          <div
            key={contact._id}
            onClick={() => onSelectContact(contact._id)}
            className={cn(
              "flex items-center gap-3 px-4 py-3 border-b cursor-pointer hover:bg-muted/50 transition-colors",
              isSelected && "bg-muted"
            )}
          >
            <Avatar>
              <AvatarFallback className="bg-primary text-primary-foreground">
                {getInitials(contact)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium truncate">
                  {contact.name || contact.primaryEmail}
                </p>
                {contact.tags && contact.tags.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    ({contact.tags.length} tag{contact.tags.length !== 1 ? "s" : ""})
                  </span>
                )}
              </div>
              {contact.name && (
                <p className="text-xs text-muted-foreground truncate">
                  {contact.primaryEmail}
                </p>
              )}
              {contact.lastContactedAt && (
                <p className="text-xs text-muted-foreground">
                  {formatLastContacted(contact.lastContactedAt)}
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

