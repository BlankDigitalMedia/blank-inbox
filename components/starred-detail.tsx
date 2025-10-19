"use client"

import { EmailDetail } from "@/components/email-detail"
import type { Email } from "@/components/email-page"

interface StarredDetailProps {
  email: Email | null
  onToggleStar: (id: string) => void
  onToggleArchive?: (id: string) => void
  onToggleTrash?: (id: string) => void
}

export function StarredDetail({ email, onToggleStar, onToggleArchive, onToggleTrash }: StarredDetailProps) {
  return (
    <EmailDetail
      email={email}
      emptyMessage="Select a starred email to read"
      showReply={true}
      showReplyAll={true}
      showForward={true}
      onToggleStar={onToggleStar}
      onToggleArchive={onToggleArchive}
      onToggleTrash={onToggleTrash}
    />
  )
}
