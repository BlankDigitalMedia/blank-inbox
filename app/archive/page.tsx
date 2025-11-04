"use client"

import { EmailPage } from "@/components/email-page"
import { EmailList } from "@/components/email-list"
import { EmailDetail } from "@/components/email-detail"
import { api } from "@/convex/_generated/api"

export default function ArchivePage() {
  return (
    <EmailPage
      title="Archive"
      activeView="archive"
      query={api.emails.listArchived}
      ListComponent={({ emails, selectedEmail, onSelectEmail, onToggleStar, onToggleArchive, onToggleTrash, scrollRef }) => (
      <EmailList
      emails={emails}
      selectedEmail={selectedEmail}
      onSelectEmail={onSelectEmail}
      onToggleStar={onToggleStar}
      onToggleArchive={onToggleArchive}
      onToggleTrash={onToggleTrash}
      showArchiveButton={false}
      showTrashButton={true}
      scrollRef={scrollRef}
      />
      )}
      DetailComponent={({ email, onToggleStar, onToggleArchive, onToggleTrash }) => (
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
      )}
      shouldRemoveOnToggle={(action, email) => {
        if (action === "archive") return true // Unarchiving moves back to inbox
        if (action === "trash") return true
        return false
      }}
    />
  )
}
