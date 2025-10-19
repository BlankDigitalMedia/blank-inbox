"use client"

import { EmailPage } from "@/components/email-page"
import { EmailList } from "@/components/email-list"
import { EmailDetail } from "@/components/email-detail"
import { api } from "@/convex/_generated/api"

export default function StarredPage() {
  return (
    <EmailPage
      title="Starred"
      activeView="starred"
      query={api.emails.listStarred}
      ListComponent={({ emails, selectedEmail, onSelectEmail, onToggleStar, onToggleArchive, onToggleTrash }) => (
        <EmailList
          title="Starred"
          countText={`${emails.length} starred`}
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
          emptyMessage="Select a starred email to read"
          showReply={true}
          showReplyAll={true}
          showForward={true}
          onToggleStar={onToggleStar}
          onToggleArchive={onToggleArchive}
          onToggleTrash={onToggleTrash}
        />
      )}
      shouldRemoveOnToggle={(action, email) => {
        if (action === "star") return true // Unstarring removes from starred view
        if (action === "trash") return true
        return false
      }}
    />
  )
}
