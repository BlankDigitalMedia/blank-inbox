"use client"

import { EmailDetail } from "@/components/email-detail"
import type { Email } from "@/components/email-page"

interface SentDetailProps {
  email: Email | null
  onToggleStar: (id: string) => void
  onToggleArchive?: (id: string) => void
  onToggleTrash?: (id: string) => void
}

export function SentDetail({ email, onToggleStar, onToggleArchive, onToggleTrash }: SentDetailProps) {
  return (
    <EmailDetail
      email={email}
      emptyMessage="Select a sent email to read"
      showReply={false}
      showReplyAll={false}
      showForward={true}
      onToggleStar={onToggleStar}
      onToggleArchive={onToggleArchive}
      onToggleTrash={onToggleTrash}
    />
  )
}
