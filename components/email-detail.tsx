"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ButtonGroup, ButtonGroupSeparator } from "@/components/ui/button-group"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Star, Archive, Trash2, Reply, ReplyAll, Forward, MoreHorizontal, ArrowLeft } from "lucide-react"
import { cn, renderEmailBody } from "@/lib/utils"
import { useCompose } from "@/app/providers/compose-provider"
import { InlineReplyEditor } from "@/components/composer/inline-reply-editor"
import type { Email, EmailDoc } from "@/lib/types"
import { Ref } from "react"

// Helper to convert EmailDoc to Email for inline replies
const emailDocToEmail = (doc: EmailDoc, threadId?: string): Email => ({
  id: doc._id,
  from: doc.from,
  to: doc.to,
  cc: doc.cc,
  bcc: doc.bcc,
  subject: doc.subject,
  preview: doc.preview,
  time: new Date(doc.receivedAt).toLocaleString(),
  read: doc.read,
  starred: doc.starred,
  archived: doc.archived,
  trashed: doc.trashed,
  category: doc.category ?? "inbox",
  body: doc.body,
  threadId: threadId ?? doc.threadId,
  threadCount: 0,
  threadEmails: [],
})

interface EmailDetailProps {
  email: Email | null
  emptyMessage?: string
  showReply?: boolean
  showReplyAll?: boolean
  showForward?: boolean
  onToggleStar: (id: string) => void
  onToggleArchive?: (id: string) => void
  onToggleTrash?: (id: string) => void
  onBack?: () => void
  contentRef?: Ref<HTMLDivElement>
}

export function EmailDetail({
  email,
  emptyMessage = "Select an email to read",
  showReply = true,
  showReplyAll = true,
  showForward = true,
  onToggleStar,
  onToggleArchive,
  onToggleTrash,
  onBack,
  contentRef
}: EmailDetailProps) {
  const { inlineReply, openInlineReply, closeInlineReply } = useCompose()

  // Cleanup inline reply when switching emails
  useEffect(() => {
    closeInlineReply()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email?.id])

  if (!email) {
    // On mobile, parent hides this pane; on desktop show empty state
    return (
      <div className="hidden lg:flex flex-1 items-center justify-center text-muted-foreground">
        <p className="text-sm">{emptyMessage}</p>
      </div>
    )
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
            <div className="text-xs text-muted-foreground truncate max-w-[14rem]">{email.from}</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onToggleStar(email.id)} aria-label={email.starred ? "Unstar email" : "Star email"}>
            <Star className={cn("h-4 w-4", email.starred && "fill-yellow-500 text-yellow-500")} />
          </Button>
          {onToggleArchive && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onToggleArchive(email.id)} aria-label={email.archived ? "Unarchive email" : "Archive email"}>
              <Archive className="h-4 w-4" />
            </Button>
          )}
          {onToggleTrash && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onToggleTrash(email.id)} aria-label={email.trashed ? "Restore from trash" : "Move to trash"}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
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
                  <p className="text-xs text-muted-foreground">to me</p>
                </div>
                <p className="text-xs text-muted-foreground">{email.time}</p>
              </div>
            </div>
          </div>

          <Separator className="mb-6" />

          {/* Thread messages if multiple */}
          {email.threadCount > 1 ? (
            <div className="space-y-6">
              {email.threadEmails.map((threadEmail: EmailDoc) => (
                <div key={threadEmail._id} className="border-t border-border pt-4 first:border-t-0 first:pt-0">
                  <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
                    <span className="font-medium">{threadEmail.from}</span>
                    <span>{new Date(threadEmail.receivedAt).toLocaleString()}</span>
                  </div>
                  <div className="prose prose-sm max-w-none">
                    <div className="text-sm leading-relaxed text-foreground" dangerouslySetInnerHTML={renderEmailBody(threadEmail.body)} />
                  </div>

                  {/* Inline reply buttons for each message */}
                  <div className="mt-3 flex gap-2">
                    {showReply && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2 h-7 text-xs"
                        onClick={() => openInlineReply(emailDocToEmail(threadEmail, email.threadId), "reply")}
                        aria-label="Reply inline"
                      >
                        <Reply className="h-3 w-3" />
                        Reply
                      </Button>
                    )}
                    {showReplyAll && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2 h-7 text-xs"
                        onClick={() => openInlineReply(emailDocToEmail(threadEmail, email.threadId), "replyAll")}
                        aria-label="Reply all inline"
                      >
                        <ReplyAll className="h-3 w-3" />
                        Reply All
                      </Button>
                    )}
                    {showForward && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2 h-7 text-xs"
                        onClick={() => openInlineReply(emailDocToEmail(threadEmail, email.threadId), "forward")}
                        aria-label="Forward inline"
                      >
                        <Forward className="h-3 w-3" />
                        Forward
                      </Button>
                    )}
                  </div>

                  {/* Render inline composer if this message is being replied to */}
                  {inlineReply?.messageId === threadEmail._id && inlineReply && inlineReply.intent !== "new" && (
                    <div className="mt-4">
                      <InlineReplyEditor
                        email={inlineReply.email}
                        intent={inlineReply.intent}
                        threadId={email.threadId}
                        onSend={closeInlineReply}
                        onCancel={closeInlineReply}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="prose prose-sm max-w-none">
                <div className="text-sm leading-relaxed text-foreground" dangerouslySetInnerHTML={renderEmailBody(email.body)} />
              </div>

              {/* Inline composer for single email */}
              {inlineReply?.messageId === email.id && inlineReply && inlineReply.intent !== "new" && (
                <div className="mt-6">
                  <InlineReplyEditor
                    email={inlineReply.email}
                    intent={inlineReply.intent}
                    threadId={email.threadId}
                    onSend={closeInlineReply}
                    onCancel={closeInlineReply}
                  />
                </div>
              )}
            </>
          )}

          {/* Actions */}
          <ButtonGroup className="mt-8 bg-background/10">
            <Button variant="outline" size="icon" className="h-8 w-8 bg-transparent hover:text-yellow-500" onClick={() => onToggleStar(email.id)} aria-label={email.starred ? "Unstar email" : "Star email"}>
              <Star className={cn("h-4 w-4", email.starred && "fill-yellow-500 text-yellow-500")} />
            </Button>
            {onToggleArchive && (
              <Button variant="outline" size="icon" className="h-8 w-8 bg-transparent hover:text-yellow-500" onClick={() => onToggleArchive(email.id)} aria-label={email.archived ? "Unarchive email" : "Archive email"}>
                <Archive className="h-4 w-4" />
              </Button>
            )}
            {onToggleTrash && (
              <Button variant="outline" size="icon" className="h-8 w-8 bg-transparent hover:text-yellow-500" onClick={() => onToggleTrash(email.id)} aria-label={email.trashed ? "Restore from trash" : "Move to trash"}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <Button variant="outline" size="icon" className="h-8 w-8 bg-transparent hover:text-yellow-500" aria-label="More actions">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
            <ButtonGroupSeparator />
            {showReply && (
              <Button variant="outline" size="sm" className="gap-2 bg-transparent hover:text-yellow-500" onClick={() => openInlineReply(email, "reply")} aria-label="Reply">
                <Reply className="h-4 w-4" />
                Reply
              </Button>
            )}
            {showReplyAll && (
              <Button variant="outline" size="sm" className="gap-2 bg-transparent hover:text-yellow-500" onClick={() => openInlineReply(email, "replyAll")} aria-label="Reply all">
                <ReplyAll className="h-4 w-4" />
                Reply All
              </Button>
            )}
            {showForward && (
              <Button variant="outline" size="sm" className="gap-2 bg-transparent hover:text-yellow-500" onClick={() => openInlineReply(email, "forward")} aria-label="Forward">
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
