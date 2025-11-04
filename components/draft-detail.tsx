"use client"

import { Ref } from "react"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Star, Archive, Trash2, Edit, Send, MoreHorizontal, ArrowLeft } from "lucide-react"
import { cn, renderEmailBody } from "@/lib/utils"
import { useRouter } from "next/navigation"
import type { Email } from "@/lib/types"

interface DraftDetailProps {
  email: Email | null
  onToggleStar: (id: string) => void
  onToggleArchive: (id: string) => void
  onDeleteDraft: (id: string) => void
  onBack?: () => void
  contentRef?: Ref<HTMLDivElement>
}

export function DraftDetail({ email, onToggleStar, onToggleArchive, onDeleteDraft, onBack, contentRef }: DraftDetailProps) {
  const router = useRouter()

  if (!email) {
    return (
      <div className="hidden lg:flex flex-1 items-center justify-center text-muted-foreground">
        <p className="text-sm">Select a draft to read</p>
      </div>
    )
  }

  const handleEditDraft = () => {
    router.push(`/compose?draft=${email.id}`)
  }

  return (
    <div className="flex flex-1 min-w-0 flex-col bg-background overflow-hidden">
      {/* Mobile header with back and quick actions */}
      <div className="lg:hidden sticky top-0 z-20 flex items-center justify-between gap-2 border-b bg-background/95 px-2 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack} aria-label="Back to list">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <div className="text-sm font-medium truncate max-w-[14rem]">{email.subject}</div>
            <div className="text-xs text-muted-foreground truncate max-w-[14rem]">Draft</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onToggleStar(email.id)} aria-label={email.starred ? "Unstar draft" : "Star draft"}>
            <Star className={cn("h-4 w-4", email.starred && "fill-yellow-500 text-yellow-500")} />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onToggleArchive(email.id)} aria-label={email.archived ? "Unarchive draft" : "Archive draft"}>
            <Archive className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDeleteDraft(email.id)} aria-label="Delete draft">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Header (desktop actions) */}
      <div className="hidden lg:flex p-4 items-center justify-between border-b border-border">
        <ButtonGroup>
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
        </ButtonGroup>
        <ButtonGroup>
          <Button variant="outline" size="sm" className="gap-2" onClick={handleEditDraft}>
            <Edit className="h-4 w-4" />
            Edit
          </Button>
          <Button size="sm" className="gap-2" onClick={handleEditDraft}>
            <Send className="h-4 w-4" />
            Send
          </Button>
        </ButtonGroup>
      </div>

      {/* Email content */}
      <div className="flex-1 min-h-0 overflow-y-auto p-6" ref={contentRef}>
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
            <div className="text-sm leading-relaxed text-foreground email-body-content" dangerouslySetInnerHTML={renderEmailBody(email.body)} />
          </div>
        </div>
      </div>
    </div>
  )
}
