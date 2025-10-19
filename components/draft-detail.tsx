"use client"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Star, Archive, Trash2, Edit, Send, MoreHorizontal } from "lucide-react"
import { cn, renderEmailBody } from "@/lib/utils"
import { useRouter } from "next/navigation"
import type { Email } from "@/app/drafts/page"

interface DraftDetailProps {
  email: Email | null
  onToggleStar: (id: string) => void
  onToggleArchive: (id: string) => void
  onDeleteDraft: (id: string) => void
}

export function DraftDetail({ email, onToggleStar, onToggleArchive, onDeleteDraft }: DraftDetailProps) {
  const router = useRouter()

  if (!email) {
    return (
      <div className="hidden lg:flex flex-1 items-center justify-center text-muted-foreground">
        <p className="text-sm">Select a draft to read</p>
      </div>
    )
  }

  const handleEditDraft = () => {
    // Navigate to compose with draft ID as query param
    router.push(`/compose?draft=${email.id}`)
  }

  return (
    <div className="hidden lg:flex flex-1 flex-col bg-background">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onToggleStar(email.id)}>
            <Star className={cn("h-4 w-4", email.starred && "fill-yellow-500 text-yellow-500")} />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onToggleArchive(email.id)}>
            <Archive className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDeleteDraft(email.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={handleEditDraft}>
            <Edit className="h-4 w-4" />
            Edit
          </Button>
          <Button size="sm" className="gap-2">
            <Send className="h-4 w-4" />
            Send
          </Button>
        </div>
      </div>

      {/* Email content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto">
          {/* Subject */}
          <h1 className="text-2xl font-semibold mb-6 text-balance">{email.subject}</h1>

          {/* Sender info */}
          <div className="flex items-start gap-4 mb-6">
            <Avatar>
              <AvatarFallback className="bg-primary text-primary-foreground">{email.from.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{email.from}</p>
                  <p className="text-xs text-muted-foreground">Draft</p>
                </div>
                <p className="text-xs text-muted-foreground">{email.time}</p>
              </div>
            </div>
          </div>

          <Separator className="mb-6" />

          {/* Email body */}
          <div className="prose prose-sm max-w-none">
            <div className="text-sm leading-relaxed text-foreground" dangerouslySetInnerHTML={renderEmailBody(email.body)} />
          </div>
        </div>
      </div>
    </div>
  )
}
