"use client"

import { useState, useCallback, useMemo, useEffect } from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import type { Doc } from "@/convex/_generated/dataModel"
import { InfiniteScroll } from "@/components/ui/infinite-scroll"
import { Skeleton } from "@/components/ui/skeleton"
import { Mail, Send, ArrowRight } from "lucide-react"
import { cn, stripHtml, extractEmailAddress, normalizeEmail } from "@/lib/utils"
import { format, isToday, isYesterday } from "date-fns"

interface ContactEventsTimelineProps {
  contactId: Id<"contacts">
  contactEmail: string
  contactEmails?: string[]
  onEmailClick?: (emailId: Id<"emails">) => void
}

type EmailDoc = Doc<"emails">

function formatEventDate(timestamp: number): string {
  const date = new Date(timestamp)
  if (isToday(date)) {
    return "Today"
  }
  if (isYesterday(date)) {
    return "Yesterday"
  }
  return format(date, "MMMM d, yyyy")
}

function formatEventTime(timestamp: number): string {
  return format(new Date(timestamp), "h:mm a")
}

function groupEmailsByDate(emails: EmailDoc[]): Map<string, EmailDoc[]> {
  const groups = new Map<string, EmailDoc[]>()
  
  emails.forEach((email) => {
    const dateKey = formatEventDate(email.receivedAt)
    if (!groups.has(dateKey)) {
      groups.set(dateKey, [])
    }
    groups.get(dateKey)!.push(email)
  })
  
  return groups
}

type AddressInfo = {
  email: string
  name?: string
}

function parseAddress(value?: string): AddressInfo | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null

  const angleMatch = trimmed.match(/^\s*"?([^"<]*)"?\s*<([^>]+)>/)
  if (angleMatch) {
    const rawName = angleMatch[1]?.trim()
    const email = extractEmailAddress(angleMatch[2] || "")
    if (!email) return null
    const name = rawName && rawName.length > 0 ? rawName : undefined
    return {
      email,
      name,
    }
  }

  const email = extractEmailAddress(trimmed)
  if (!email) return null
  return {
    email,
  }
}

function parseAddressList(value?: string): AddressInfo[] {
  if (!value) return []
  return value
    .split(",")
    .map((segment) => parseAddress(segment))
    .filter((info): info is AddressInfo => Boolean(info?.email))
}

function findMatchingRecipient(email: EmailDoc, contactEmails: Set<string>): AddressInfo | null {
  const fields = [email.to, email.cc, email.bcc]
  for (const field of fields) {
    const addresses = parseAddressList(field)
    for (const address of addresses) {
      if (contactEmails.has(normalizeEmail(address.email))) {
        return address
      }
    }
  }
  return null
}

function getEmailDirection(email: EmailDoc, contactEmails: Set<string>): "sent" | "received" {
  if (email.sent) {
    return "sent"
  }
  const sender = parseAddress(email.from)
  if (sender && contactEmails.has(normalizeEmail(sender.email))) {
    return "received"
  }
  return "sent"
}

function getDisplayParts(info: AddressInfo | null): { label: string; subLabel?: string } {
  if (!info) {
    return { label: "Unknown" }
  }
  const label = info.name && info.name.length > 0 ? info.name : info.email
  const subLabel = info.name && info.name.length > 0 ? info.email : undefined
  return { label, subLabel }
}

export function ContactEventsTimeline({
  contactId,
  contactEmail,
  contactEmails,
  onEmailClick,
}: ContactEventsTimelineProps) {
  const [cursor, setCursor] = useState<string | undefined>(undefined)
  const [allEmails, setAllEmails] = useState<EmailDoc[]>([])

  const normalizedContactEmails = useMemo(() => {
    const set = new Set<string>()
    if (contactEmail) {
      set.add(normalizeEmail(contactEmail))
    }
    if (contactEmails) {
      contactEmails.forEach((email) => {
        if (email) {
          set.add(normalizeEmail(email))
        }
      })
    }
    return set
  }, [contactEmail, contactEmails])

  const result = useQuery(api.emails.getContactEmails, {
    contactId,
    cursor: cursor ?? undefined,
  })

  // Update accumulated emails when new page arrives
  useEffect(() => {
    if (result) {
      if (cursor === undefined) {
        // First page - replace
        setAllEmails(result.page)
      } else {
        // Subsequent pages - append
        setAllEmails((prev) => [...prev, ...result.page])
      }
    }
  }, [result, cursor])

  const handleLoadMore = useCallback(() => {
    if (result?.continueCursor && !result.isDone) {
      setCursor(result.continueCursor)
    }
  }, [result])

  const groupedEmails = useMemo(() => {
    return groupEmailsByDate(allEmails)
  }, [allEmails])

  // Sort emails within each group by receivedAt (most recent first)
  const sortedGroupedEmails = useMemo(() => {
    const sorted = new Map<string, EmailDoc[]>()
    groupedEmails.forEach((emails, dateKey) => {
      sorted.set(dateKey, [...emails].sort((a, b) => b.receivedAt - a.receivedAt))
    })
    return sorted
  }, [groupedEmails])

  // Get sorted date keys (Today, Yesterday, then chronological)
  const sortedDateKeys = useMemo(() => {
    const keys = Array.from(groupedEmails.keys())
    const todayKey = keys.find((k) => k === "Today")
    const yesterdayKey = keys.find((k) => k === "Yesterday")
    const otherKeys = keys.filter((k) => k !== "Today" && k !== "Yesterday")
    
    // Sort other keys by getting the first email's receivedAt from each group
    const sortedOtherKeys = otherKeys.sort((a, b) => {
      const emailsA = groupedEmails.get(a)!
      const emailsB = groupedEmails.get(b)!
      const latestA = Math.max(...emailsA.map((e) => e.receivedAt))
      const latestB = Math.max(...emailsB.map((e) => e.receivedAt))
      return latestB - latestA // Most recent first
    })
    
    return [
      ...(todayKey ? [todayKey] : []),
      ...(yesterdayKey ? [yesterdayKey] : []),
      ...sortedOtherKeys,
    ]
  }, [groupedEmails])

  // Flatten all emails for infinite scroll
  const flatEmails = useMemo(() => {
    return sortedDateKeys.flatMap((dateKey) => {
      const emails = sortedGroupedEmails.get(dateKey)!
      return emails.map((email) => ({ email, dateKey }))
    })
  }, [sortedDateKeys, sortedGroupedEmails])

  // Conditional returns after all hooks
  if (!result && allEmails.length === 0) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    )
  }

  if (allEmails.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No email history found</p>
      </div>
    )
  }

  return (
    <InfiniteScroll
      items={flatEmails}
      hasNextPage={result ? !result.isDone : false}
      isLoading={!result}
      onLoadMore={handleLoadMore}
      loadingComponent={
        <div className="flex items-center justify-center gap-2 py-4">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-sm text-muted-foreground">Loading more...</span>
        </div>
      }
      renderItem={(item, index) => {
        const { email, dateKey } = item
        const prevItem = index > 0 ? flatEmails[index - 1] : null
        const showDateHeader = !prevItem || prevItem.dateKey !== dateKey
        
        const direction = getEmailDirection(email, normalizedContactEmails)

        const senderInfo = parseAddress(email.from)
        const recipientInfo = findMatchingRecipient(email, normalizedContactEmails)
        const fallbackContact = parseAddress(contactEmail)
        const participant = direction === "received" ? senderInfo : recipientInfo || fallbackContact
        const { label: participantLabel, subLabel: participantSubLabel } = getDisplayParts(participant)

        return (
          <div key={email._id}>
            {showDateHeader && (
              <div className="sticky top-0 z-10 bg-background py-2 mb-3">
                <h3 className="text-sm font-semibold text-muted-foreground">{dateKey}</h3>
              </div>
            )}
            
            <div className="relative pl-6 mb-4">
              {/* Timeline dot */}
              <div
                className={cn(
                  "absolute left-0 top-2 w-4 h-4 rounded-full border-2 border-background z-10",
                  direction === "sent" ? "bg-blue-500" : "bg-green-500"
                )}
              />
              
              {/* Vertical line - connect to next item */}
              {index < flatEmails.length - 1 && (
                <div className="absolute left-2 top-4 bottom-0 w-0.5 bg-border" />
              )}

              {/* Event card */}
              <div
                className={cn(
                  "ml-6 rounded-lg border bg-card p-3 hover:bg-accent/50 transition-colors",
                  onEmailClick && "cursor-pointer hover:shadow-sm"
                )}
                onClick={() => onEmailClick?.(email._id)}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {direction === "sent" ? (
                      <Send className="h-4 w-4 text-blue-500 shrink-0" />
                    ) : (
                      <Mail className="h-4 w-4 text-green-500 shrink-0" />
                    )}
                    <span className="text-xs font-medium text-muted-foreground capitalize">
                      {direction}
                    </span>
                    <div className="flex items-center gap-1 min-w-0">
                      {direction === "sent" && (
                        <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-muted-foreground truncate">{participantLabel}</p>
                        {participantSubLabel && (
                          <p className="text-[11px] text-muted-foreground/80 truncate">
                            {participantSubLabel}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatEventTime(email.receivedAt)}
                  </span>
                </div>

                <h4 className="text-sm font-medium truncate mb-1">{email.subject || "(No subject)"}</h4>
                {email.preview && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {stripHtml(email.preview)}
                  </p>
                )}
              </div>
            </div>
          </div>
        )
      }}
      className="space-y-6"
    />
  )
}

