"use client"

import { useState } from "react"
import { MailSidebar } from "@/components/mail-sidebar"
import { DraftList } from "@/components/draft-list"
import { DraftDetail } from "@/components/draft-detail"
import { Button } from "@/components/ui/button"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Email } from "@/components/email-page"

export default function DraftsPage() {
  const emails = useQuery(api.emails.listDrafts) as any[] | undefined
  const toggleStar = useMutation(api.emails.toggleStar)
  const toggleArchive = useMutation(api.emails.toggleArchive)
  const markRead = useMutation(api.emails.markRead)
  const deleteDraft = useMutation(api.emails.deleteDraft)
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)

  const handleToggleStar = async (id: string) => {
    await toggleStar({ id: id as any })
    if (selectedEmail?.id === id) {
      setSelectedEmail({ ...selectedEmail, starred: !selectedEmail.starred })
    }
  }

  const handleToggleArchive = async (id: string) => {
    await toggleArchive({ id: id as any })
    if (selectedEmail?.id === id) {
      setSelectedEmail({ ...selectedEmail, archived: !(selectedEmail.archived ?? false) })
    }
  }

  const handleDeleteDraft = async (id: string) => {
    await deleteDraft({ id: id as any })
    if (selectedEmail?.id === id) {
      setSelectedEmail(null)
    }
  }

  const handleMarkRead = async (id: string) => {
    await markRead({ id: id as any })
    if (selectedEmail?.id === id) {
      setSelectedEmail({ ...selectedEmail, read: true })
    }
  }

  return (
    <SidebarProvider>
      <MailSidebar activeView="drafts" />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <h1 className="text-lg font-semibold">Drafts</h1>
        </header>
        <div className="flex flex-1">
          <DraftList
            emails={(emails ?? []).map((e) => ({
              id: e._id,
              from: e.from,
              subject: e.subject,
              preview: e.preview,
              time: new Date(e.receivedAt).toLocaleString(),
              read: e.read,
              starred: e.starred,
              archived: e.archived,
              category: e.category ?? "inbox",
              body: e.body,
            }))}
            selectedEmail={selectedEmail}
            onSelectEmail={(email) => {
              setSelectedEmail(email)
              handleMarkRead(email.id)
            }}
            onToggleStar={handleToggleStar}
            onToggleArchive={handleToggleArchive}
            onDeleteDraft={handleDeleteDraft}
          />

          <DraftDetail
            email={selectedEmail}
            onToggleStar={handleToggleStar}
            onToggleArchive={handleToggleArchive}
            onDeleteDraft={handleDeleteDraft}
          />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
