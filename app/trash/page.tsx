"use client"

import { useState } from "react"
import { MailSidebar } from "@/components/mail-sidebar"
import { TrashList } from "@/components/trash-list"
import { TrashDetail } from "@/components/trash-detail"
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
  subject: string
  preview: string
  time: string
  read: boolean
  starred: boolean
  trashed: boolean
  category: string
  body: string
}

export default function TrashPage() {
  const emails = useQuery(api.emails.listTrashed) as any[] | undefined
  const toggleStar = useMutation(api.emails.toggleStar)
  const toggleTrash = useMutation(api.emails.toggleTrash)
  const markRead = useMutation(api.emails.markRead)
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)

  const handleToggleStar = async (id: string) => {
    await toggleStar({ id: id as any })
    if (selectedEmail?.id === id) {
      setSelectedEmail({ ...selectedEmail, starred: !selectedEmail.starred })
    }
  }

  const handleToggleTrash = async (id: string) => {
    await toggleTrash({ id: id as any })
    // Remove from selected email if untrashed (moved back)
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
      <MailSidebar activeView="trash" />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <h1 className="text-lg font-semibold">Trash</h1>
        </header>
        <div className="flex flex-1">
          {/* Trashed email list */}
          <TrashList
            emails={(emails ?? []).map((e) => ({
              id: e._id,
              from: e.from,
              subject: e.subject,
              preview: e.preview,
              time: new Date(e.receivedAt).toLocaleString(),
              read: e.read,
              starred: e.starred,
              trashed: e.trashed,
              category: e.category ?? "inbox",
              body: e.body,
            }))}
            selectedEmail={selectedEmail}
            onSelectEmail={(email) => {
              setSelectedEmail(email)
              handleMarkRead(email.id)
            }}
            onToggleStar={handleToggleStar}
            onToggleTrash={handleToggleTrash}
          />

          {/* Trashed email detail */}
          <TrashDetail email={selectedEmail} onToggleStar={handleToggleStar} onToggleTrash={handleToggleTrash} />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
