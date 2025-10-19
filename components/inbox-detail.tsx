"use client"

import { EmailDetail } from "@/components/email-detail"
import type { Email } from "@/components/email-page"

interface InboxDetailProps {
  email: Email | null
  onToggleStar: (id: string) => void
  onToggleArchive?: (id: string) => void
  onToggleTrash?: (id: string) => void
}

export function InboxDetail({ email, onToggleStar, onToggleArchive, onToggleTrash }: InboxDetailProps) {
return (
  <EmailDetail
      email={email}
      emptyMessage="Select an email to read"
      showReply={true}
    showReplyAll={true}
      showForward={true}
    onToggleStar={onToggleStar}
  onToggleArchive={onToggleArchive}
onToggleTrash={onToggleTrash}
/>
)
}
