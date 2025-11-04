"use client"

import { useMemo } from "react"
import type { Email } from "@/lib/types"

// TODO: Fetch these from user settings/database instead of hardcoding
// This is the single source of truth for available sender addresses
export const FROM_ADDRESSES = [
  { value: "hi@daveblank.dev", label: "hi@daveblank.dev" },
  { value: "info@daveblank.dev", label: "info@daveblank.dev" },
]

const parseRecipientValue = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return null

  const angleMatch = trimmed.match(/<([^>]+)>/)
  const raw = angleMatch?.[1] ?? trimmed
  const sanitized = raw.replace(/^[\s,;"']+|[\s,;"']+$/g, "")
  if (!sanitized) return null
  return sanitized
}

interface UseSenderSelectionOptions {
  email?: Email
  intent: "new" | "reply" | "replyAll" | "forward"
}

/**
 * Determines the appropriate sender address based on the email being replied to.
 * For replies, selects the address that received the original email if available.
 * For new emails, defaults to the first available address.
 */
export function useSenderSelection({ email, intent }: UseSenderSelectionOptions) {
  const selectedFrom = useMemo(() => {
    if (intent === 'new' || !email) {
      return FROM_ADDRESSES[0]?.value || ""
    }

    // For replies, try to match the address that received the email
    const firstTo = email.to?.split(',')[0]
    const receivedTo = firstTo ? parseRecipientValue(firstTo) : null
    const matchingFrom = FROM_ADDRESSES.find(addr => addr.value === receivedTo)
    
    return matchingFrom?.value || FROM_ADDRESSES[0]?.value || ""
  }, [email, intent])

  return {
    selectedFrom,
    availableAddresses: FROM_ADDRESSES,
  }
}
