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
  threadId?: string
  threadCount: number
  threadEmails: any[]
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

  // Group emails by threadId for threading support
  const emailGroups = (emails ?? []).reduce((groups, email) => {
    const threadId = email.threadId || email._id // Use email ID as thread ID if no threadId
    if (!groups[threadId]) {
    groups[threadId] = []
    }
    groups[threadId].push(email)
    return groups
  }, {} as Record<string, any[]>)

  // For each thread, take the latest email and add thread info
  const transformedEmails = Object.values(emailGroups).map((threadEmails) => {
  // Sort thread by receivedAt descending (latest first)
  const sortedThread = (threadEmails as any[]).sort((a, b) => b.receivedAt - a.receivedAt)
  const latestEmail = sortedThread[0]
  const threadCount = sortedThread.length

    return {
      id: latestEmail._id,
      from: latestEmail.from,
      subject: latestEmail.subject,
      preview: latestEmail.preview,
      time: new Date(latestEmail.receivedAt).toLocaleString(),
      read: latestEmail.read,
      starred: latestEmail.starred,
      archived: latestEmail.archived,
      trashed: latestEmail.trashed,
      category: latestEmail.category ?? "inbox",
      body: latestEmail.body,
      threadId: latestEmail.threadId,
      threadCount,
      threadEmails: sortedThread, // Include all emails in thread for detail view
    }
  })

  return (
    <SidebarProvider>
      <MailSidebar activeView={activeView as "inbox" | "starred" | "sent" | "archive" | "trash" | "drafts"} />
      <SidebarInset>
        <div className="flex h-full flex-col overflow-hidden">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <SidebarTrigger className="-ml-1" />
            <h1 className="text-lg font-semibold">{title}</h1>
          </header>
          <div className="flex flex-1 min-h-0 overflow-hidden">
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
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
