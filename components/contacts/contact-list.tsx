"use client"

import { useMemo } from "react"
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

  const lastContactedTimes = useMemo(() => {
    // eslint-disable-next-line react-hooks/purity
    const now = Date.now()
    return contacts.reduce((acc, contact) => {
      if (!contact.lastContactedAt) {
        acc[contact._id] = null
        return acc
      }

      const date = new Date(contact.lastContactedAt)
      const diffMs = now - contact.lastContactedAt
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

      let formatted: string
      if (diffDays === 0) formatted = "Today"
      else if (diffDays === 1) formatted = "Yesterday"
      else if (diffDays < 7) formatted = `${diffDays} days ago`
      else if (diffDays < 30) formatted = `${Math.floor(diffDays / 7)} weeks ago`
      else formatted = date.toLocaleDateString()

      acc[contact._id] = formatted
      return acc
    }, {} as Record<string, string | null>)
  }, [contacts])

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
              {lastContactedTimes[contact._id] && (
                <p className="text-xs text-muted-foreground">
                  {lastContactedTimes[contact._id]}
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}


