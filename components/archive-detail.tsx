"use client"

import { EmailDetail } from "@/components/email-detail"
import type { Email } from "@/components/email-page"

interface ArchiveDetailProps {
  email: Email | null
  onToggleStar: (id: string) => void
  onToggleArchive: (id: string) => void
  onToggleTrash: (id: string) => void
}

export function ArchiveDetail({ email, onToggleStar, onToggleArchive, onToggleTrash }: ArchiveDetailProps) {
return (
  <EmailDetail
      email={email}
      emptyMessage="Select an archived email to read"
      showReply={true}
    showReplyAll={true}
      showForward={true}
    onToggleStar={onToggleStar}
  onToggleArchive={onToggleArchive}
onToggleTrash={onToggleTrash}
/>
)
}
