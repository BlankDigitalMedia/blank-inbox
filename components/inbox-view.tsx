"use client"

import { useState } from "react"
import { InboxSidebar } from "@/components/inbox-sidebar"
import { InboxList } from "@/components/inbox-list"
import { InboxDetail } from "@/components/inbox-detail"
import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"
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
  category: string
  body: string
}

export function InboxView() {
  const emails = useQuery(api.emails.list) as any[] | undefined
  const toggleStar = useMutation(api.emails.toggleStar)
  const markRead = useMutation(api.emails.markRead)
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleToggleStar = async (id: string) => {
    // optimistic updates can be added later; MVP just mutate
    await toggleStar({ id: id as any })
    if (selectedEmail?._id === id) {
      setSelectedEmail({ ...selectedEmail, starred: !selectedEmail.starred })
    }
  }

  const handleMarkRead = async (id: string) => {
    await markRead({ id: id as any })
    if (selectedEmail?._id === id) {
      setSelectedEmail({ ...selectedEmail, read: true })
    }
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile sidebar toggle */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button variant="outline" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
          <Menu className="h-4 w-4" />
        </Button>
      </div>

      {/* Sidebar */}
      <div className={`${sidebarOpen ? "block" : "hidden"} lg:block fixed lg:relative inset-0 z-40 lg:z-0`}>
        <InboxSidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Email list */}
      <InboxList
        emails={(emails ?? []).map((e) => ({
          id: e._id,
          from: e.from,
          subject: e.subject,
          preview: e.preview,
          time: new Date(e.receivedAt).toLocaleString(),
          read: e.read,
          starred: e.starred,
          category: e.category ?? "inbox",
          body: e.body,
        }))}
        selectedEmail={selectedEmail}
        onSelectEmail={(email) => {
          setSelectedEmail(email)
          handleMarkRead(email.id)
          setSidebarOpen(false)
        }}
        onToggleStar={handleToggleStar}
      />

      {/* Email detail */}
      <InboxDetail email={selectedEmail} onToggleStar={handleToggleStar} />
    </div>
  )
}
