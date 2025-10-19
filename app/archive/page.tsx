"use client"

import { useState } from "react"
import { ArchiveSidebar } from "@/components/archive-sidebar"
import { ArchiveList } from "@/components/archive-list"
import { ArchiveDetail } from "@/components/archive-detail"
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
  archived: boolean
  category: string
  body: string
}

export default function ArchivePage() {
  const emails = useQuery(api.emails.listArchived) as any[] | undefined
  const toggleStar = useMutation(api.emails.toggleStar)
  const toggleArchive = useMutation(api.emails.toggleArchive)
  const markRead = useMutation(api.emails.markRead)
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)

  const handleToggleStar = async (id: string) => {
    await toggleStar({ id: id as any })
    if (selectedEmail?._id === id) {
      setSelectedEmail({ ...selectedEmail, starred: !selectedEmail.starred })
    }
  }

  const handleToggleArchive = async (id: string) => {
    await toggleArchive({ id: id as any })
    // Remove from selected email if unarchived (moved back to inbox)
    if (selectedEmail?._id === id) {
      setSelectedEmail(null)
    }
  }

  const handleMarkRead = async (id: string) => {
    await markRead({ id: id as any })
    if (selectedEmail?._id === id) {
      setSelectedEmail({ ...selectedEmail, read: true })
    }
  }

  return (
    <SidebarProvider>
      <ArchiveSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <h1 className="text-lg font-semibold">Archive</h1>
        </header>
        <div className="flex flex-1">
          {/* Archived email list */}
          <ArchiveList
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
          />

          {/* Archived email detail */}
          <ArchiveDetail email={selectedEmail} onToggleStar={handleToggleStar} onToggleArchive={handleToggleArchive} />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
