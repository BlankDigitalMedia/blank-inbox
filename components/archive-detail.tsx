"use client"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Star, Archive, Trash2, Reply, ReplyAll, Forward, MoreHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Email } from "@/app/archive/page"

interface ArchiveDetailProps {
  email: Email | null
  onToggleStar: (id: string) => void
  onToggleArchive: (id: string) => void
}

export function ArchiveDetail({ email, onToggleStar, onToggleArchive }: ArchiveDetailProps) {
  if (!email) {
    return (
      <div className="hidden lg:flex flex-1 items-center justify-center text-muted-foreground">
        <p className="text-sm">Select an archived email to read</p>
      </div>
    )
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
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
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
                  <p className="text-xs text-muted-foreground">to me</p>
                </div>
                <p className="text-xs text-muted-foreground">{email.time}</p>
              </div>
            </div>
          </div>

          <Separator className="mb-6" />

          {/* Email body */}
          <div className="prose prose-sm max-w-none">
            <p className="text-sm leading-relaxed text-foreground">{email.body}</p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 mt-8">
            <Button size="sm" className="gap-2">
              <Reply className="h-4 w-4" />
              Reply
            </Button>
            <Button variant="outline" size="sm" className="gap-2 bg-transparent">
              <ReplyAll className="h-4 w-4" />
              Reply All
            </Button>
            <Button variant="outline" size="sm" className="gap-2 bg-transparent">
              <Forward className="h-4 w-4" />
              Forward
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
