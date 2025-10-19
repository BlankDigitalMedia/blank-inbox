"use client"

import { EmailPage } from "@/components/email-page"
import { EmailList } from "@/components/email-list"
import { EmailDetail } from "@/components/email-detail"
import { api } from "@/convex/_generated/api"

export default function Page() {
  return (
    <EmailPage
      title="Inbox"
      activeView="inbox"
      query={api.emails.list}
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
      DetailComponent={EmailDetail}
      shouldRemoveOnToggle={(action, email) => {
        if (action === "archive") return true
        if (action === "trash") return true
        return false
      }}
    />
  )
}
