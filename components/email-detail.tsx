"use client"

import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Star, Archive, Trash2, Reply, ReplyAll, Forward, MoreHorizontal } from "lucide-react"
import { cn, renderEmailBody } from "@/lib/utils"
import { useRouter } from "next/navigation"
import type { Email } from "@/components/email-page"

interface EmailDetailProps {
  email: Email | null
  emptyMessage?: string
  showReply?: boolean
  showReplyAll?: boolean
  showForward?: boolean
  onToggleStar: (id: string) => void
  onToggleArchive?: (id: string) => void
  onToggleTrash?: (id: string) => void
}

export function EmailDetail({
  email,
  emptyMessage = "Select an email to read",
  showReply = true,
  showReplyAll = true,
  showForward = true,
  onToggleStar,
  onToggleArchive,
  onToggleTrash
}: EmailDetailProps) {
  const router = useRouter()

  const handleReply = () => {
    if (email) {
      router.push(`/compose?reply=${email.id}`)
    }
  }

  const handleReplyAll = () => {
    if (email) {
      router.push(`/compose?replyAll=${email.id}`)
    }
  }

  const handleForward = () => {
    if (email) {
      router.push(`/compose?forward=${email.id}`)
    }
  }

  if (!email) {
    return (
      <div className="hidden lg:flex flex-1 items-center justify-center text-muted-foreground">
        <p className="text-sm">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="hidden lg:flex flex-1 flex-col bg-background">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-border">
        <ButtonGroup>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onToggleStar(email.id)}>
        <Star className={cn("h-4 w-4", email.starred && "fill-yellow-500 text-yellow-500")} />
        </Button>
        {onToggleArchive && (
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onToggleArchive(email.id)}>
        <Archive className="h-4 w-4" />
        </Button>
        )}
        {onToggleTrash && (
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onToggleTrash(email.id)}>
        <Trash2 className="h-4 w-4" />
        </Button>
        )}
        <Button variant="ghost" size="icon" className="h-8 w-8">
        <MoreHorizontal className="h-4 w-4" />
        </Button>
        </ButtonGroup>
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
                  <p className="text-xs text-muted-foreground">to me</p>
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

          {/* Actions */}
          <ButtonGroup className="mt-8">
          {showReply && (
          <Button size="sm" className="gap-2" onClick={handleReply}>
          <Reply className="h-4 w-4" />
          Reply
          </Button>
          )}
          {showReplyAll && (
          <Button variant="outline" size="sm" className="gap-2 bg-transparent" onClick={handleReplyAll}>
          <ReplyAll className="h-4 w-4" />
          Reply All
          </Button>
          )}
          {showForward && (
          <Button variant="outline" size="sm" className="gap-2 bg-transparent" onClick={handleForward}>
          <Forward className="h-4 w-4" />
          Forward
          </Button>
          )}
          </ButtonGroup>
        </div>
      </div>
    </div>
  )
}
