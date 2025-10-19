"use client"

import { EmailPage } from "@/components/email-page"
import { EmailList } from "@/components/email-list"
import { EmailDetail } from "@/components/email-detail"
import { api } from "@/convex/_generated/api"

export default function TrashPage() {
  return (
    <EmailPage
      title="Trash"
      activeView="trash"
      query={api.emails.listTrashed}
      ListComponent={({ emails, selectedEmail, onSelectEmail, onToggleStar, onToggleArchive, onToggleTrash }) => (
      <EmailList
      emails={emails}
      selectedEmail={selectedEmail}
      onSelectEmail={onSelectEmail}
      onToggleStar={onToggleStar}
      onToggleArchive={onToggleArchive}
      onToggleTrash={onToggleTrash}
      showArchiveButton={true}
      showTrashButton={false} // Trash view doesn't need trash button
      />
      )}
      DetailComponent={({ email, onToggleStar, onToggleArchive, onToggleTrash }) => (
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
      )}
      shouldRemoveOnToggle={(action, email) => {
        if (action === "trash") return true // Untrashing moves back to original location
        return false
      }}
    />
  )
}
