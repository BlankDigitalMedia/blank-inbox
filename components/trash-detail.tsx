"use client"

import { EmailDetail } from "@/components/email-detail"
import type { Email } from "@/components/email-page"

interface TrashDetailProps {
  email: Email | null
  onToggleStar: (id: string) => void
  onToggleArchive?: (id: string) => void
  onToggleTrash?: (id: string) => void
}

export function TrashDetail({ email, onToggleStar, onToggleArchive, onToggleTrash }: TrashDetailProps) {
  return (
    <EmailDetail
      email={email}
      emptyMessage="Select a trashed email to read"
      showReply={true}
      showReplyAll={true}
      showForward={true}
      onToggleStar={onToggleStar}
      onToggleArchive={onToggleArchive}
      onToggleTrash={onToggleTrash}
    />
  )
}
