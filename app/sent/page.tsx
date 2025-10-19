"use client"

import { useState } from "react"
import { MailSidebar } from "@/components/mail-sidebar"
import { SentList } from "@/components/sent-list"
import { SentDetail } from "@/components/sent-detail"
import { Button } from "@/components/ui/button"
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"

export type Email = {
  id: string
  from: string
  to?: string
  subject: string
  preview: string
  time: string
  read: boolean
  starred: boolean
  archived: boolean
  category: string
  body: string
}

export default function SentPage() {
  const emails = useQuery(api.emails.listSent) as any[] | undefined
  const toggleStar = useMutation(api.emails.toggleStar)
  const toggleArchive = useMutation(api.emails.toggleArchive)
  const toggleTrash = useMutation(api.emails.toggleTrash)
  const markRead = useMutation(api.emails.markRead)
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)

  const handleToggleStar = async (id: string) => {
    await toggleStar({ id: id as any })
    // Remove from selected email if unstarred (no longer in sent view)
    if (selectedEmail?.id === id) {
      setSelectedEmail(null)
    }
  }

  const handleToggleArchive = async (id: string) => {
    await toggleArchive({ id: id as any })
    if (selectedEmail?.id === id) {
      setSelectedEmail({ ...selectedEmail, archived: !(selectedEmail.archived ?? false) })
    }
  }

  const handleToggleTrash = async (id: string) => {
    await toggleTrash({ id: id as any })
    // Remove from selected email if trashed
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
      <MailSidebar activeView="sent" />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <h1 className="text-lg font-semibold">Sent</h1>
        </header>
        <div className="flex flex-1">
          {/* Sent email list */}
          <SentList
            emails={(emails ?? []).map((e) => ({
              id: e._id,
              from: e.from,
              to: e.to,
              subject: e.subject,
              preview: e.preview,
              time: new Date(e.receivedAt).toLocaleString(),
              read: e.read,
              starred: e.starred,
              archived: e.archived ?? false,
              category: e.category ?? "sent",
              body: e.body,
            }))}
            selectedEmail={selectedEmail}
            onSelectEmail={(email) => {
              setSelectedEmail(email)
              handleMarkRead(email.id)
            }}
            onToggleStar={handleToggleStar}
            onToggleArchive={handleToggleArchive}
            onToggleTrash={handleToggleTrash}
          />

          {/* Sent email detail */}
          <SentDetail email={selectedEmail} onToggleStar={handleToggleStar} onToggleArchive={handleToggleArchive} onToggleTrash={handleToggleTrash} />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
