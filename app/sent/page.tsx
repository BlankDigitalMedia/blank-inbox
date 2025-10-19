"use client"

import { EmailPage } from "@/components/email-page"
import { EmailList } from "@/components/email-list"
import { EmailDetail } from "@/components/email-detail"
import { api } from "@/convex/_generated/api"

export default function SentPage() {
  return (
    <EmailPage
      title="Sent"
      activeView="sent"
      query={api.emails.listSent}
      ListComponent={({ emails, selectedEmail, onSelectEmail, onToggleStar, onToggleArchive, onToggleTrash }) => (
      <EmailList
      emails={emails}
      selectedEmail={selectedEmail}
      onSelectEmail={onSelectEmail}
      onToggleStar={onToggleStar}
      onToggleArchive={onToggleArchive}
      onToggleTrash={onToggleTrash}
      showArchiveButton={true}
      showTrashButton={true}
      />
      )}
      DetailComponent={({ email, onToggleStar, onToggleArchive, onToggleTrash }) => (
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
      )}
      shouldRemoveOnToggle={(action, email) => {
        if (action === "trash") return true
        return false
      }}
    />
  )
}
