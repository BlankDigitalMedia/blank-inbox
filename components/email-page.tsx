"use client"

import { useState } from "react"
import { MailSidebar } from "@/components/mail-sidebar"
import { Button } from "@/components/ui/button"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"

export type Email = {
  id: string
  from: string
  to?: string
  cc?: string
  bcc?: string
  subject: string
  preview: string
  time: string
  read: boolean
  starred: boolean
  archived?: boolean
  trashed?: boolean
  category: string
  body: string
}

interface EmailPageProps {
  title: string
  activeView: string
  query: any // Convex query function
  ListComponent: React.ComponentType<any>
  DetailComponent: React.ComponentType<any>
  shouldRemoveOnToggle?: (action: string, email: Email) => boolean
}

export function EmailPage({
  title,
  activeView,
  query,
  ListComponent,
  DetailComponent,
  shouldRemoveOnToggle
}: EmailPageProps) {

  const emails = useQuery(query) as any[] | undefined
  const toggleStar = useMutation(api.emails.toggleStar)
  const toggleArchive = useMutation(api.emails.toggleArchive)
  const toggleTrash = useMutation(api.emails.toggleTrash)
  const markRead = useMutation(api.emails.markRead)
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)

  const handleToggleStar = async (id: string) => {
    await toggleStar({ id: id as any })
    if (selectedEmail?.id === id) {
      const shouldRemove = shouldRemoveOnToggle?.("star", selectedEmail)
      if (shouldRemove) {
        setSelectedEmail(null)
      } else {
        setSelectedEmail({ ...selectedEmail, starred: !selectedEmail.starred })
      }
    }
  }

  const handleToggleArchive = async (id: string) => {
    await toggleArchive({ id: id as any })
    if (selectedEmail?.id === id) {
      const shouldRemove = shouldRemoveOnToggle?.("archive", selectedEmail)
      if (shouldRemove) {
        setSelectedEmail(null)
      } else {
        setSelectedEmail({ ...selectedEmail, archived: !(selectedEmail.archived ?? false) })
      }
    }
  }

  const handleToggleTrash = async (id: string) => {
    await toggleTrash({ id: id as any })
    if (selectedEmail?.id === id) {
      const shouldRemove = shouldRemoveOnToggle?.("trash", selectedEmail)
      if (shouldRemove) {
        setSelectedEmail(null)
      }
    }
  }

  const handleMarkRead = async (id: string) => {
    await markRead({ id: id as any })
    if (selectedEmail?.id === id) {
      setSelectedEmail({ ...selectedEmail, read: true })
    }
  }

  const transformedEmails = (emails ?? []).map((e) => ({
    id: e._id,
    from: e.from,
    subject: e.subject,
    preview: e.preview,
    time: new Date(e.receivedAt).toLocaleString(),
    read: e.read,
    starred: e.starred,
    archived: e.archived,
    trashed: e.trashed,
    category: e.category ?? "inbox",
    body: e.body,
  }))

  return (
    <SidebarProvider>
      <MailSidebar activeView={activeView as "inbox" | "starred" | "sent" | "archive" | "trash" | "drafts"} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <h1 className="text-lg font-semibold">{title}</h1>
        </header>
        <div className="flex flex-1">
          <ListComponent
            emails={transformedEmails}
            selectedEmail={selectedEmail}
            onSelectEmail={(email: Email) => {
              setSelectedEmail(email)
              handleMarkRead(email.id)
            }}
            onToggleStar={handleToggleStar}
            onToggleArchive={handleToggleArchive}
            onToggleTrash={handleToggleTrash}
          />

          <DetailComponent
            email={selectedEmail}
            onToggleStar={handleToggleStar}
            onToggleArchive={handleToggleArchive}
            onToggleTrash={handleToggleTrash}
          />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
