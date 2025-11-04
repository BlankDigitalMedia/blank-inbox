"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useAction } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { Send, X } from "lucide-react"
import { toast } from "sonner"
import type { Email } from "@/lib/types"
import DOMPurify from 'dompurify'
import { useSenderSelection } from "@/hooks/use-sender-selection"
import { useDraftAutosave } from "@/hooks/use-draft-autosave"

const parseRecipientValue = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return null

  const angleMatch = trimmed.match(/<([^>]+)>/)
  const raw = angleMatch?.[1] ?? trimmed
  const sanitized = raw.replace(/^[\s,;"']+|[\s,;"']+$/g, "")
  if (!sanitized) return null
  return sanitized
}

const parseRecipientList = (value?: string) => {
  if (!value) return []
  return value
    .split(/[,;\n]+/)
    .map(parseRecipientValue)
    .filter((addr): addr is string => Boolean(addr))
}

interface InlineReplyEditorProps {
  email: Email
  intent: "reply" | "replyAll" | "forward"
  threadId?: string
  onSend: () => void
  onCancel: () => void
  onOpenFullComposer?: () => void
}

export function InlineReplyEditor({
  email,
  intent,
  threadId,
  onSend,
  onCancel,
  onOpenFullComposer,
}: InlineReplyEditorProps) {
  const [isSending, setIsSending] = useState(false)
  const [currentDraftId, setCurrentDraftId] = useState<string | undefined>()
  
  const sendEmail = useAction(api.emails.sendEmail)
  const { selectedFrom, availableAddresses } = useSenderSelection({ email, intent })

  // Calculate recipients based on intent
  const { to, subject } = useCallback(() => {
    const from = selectedFrom

    if (intent === 'reply') {
      const toRecipients = email?.from ? parseRecipientList(email.from) : []
      const subj = email.subject?.startsWith("Re:") ? email.subject : `Re: ${email.subject || ""}`
      return { to: toRecipients.join(", "), subject: subj }
    }
    
    if (intent === 'replyAll') {
      const recipients = new Set<string>()
      const ourAddresses = availableAddresses.map(addr => addr.value)
      
      const fromAddress = email.from ? parseRecipientValue(email.from) : null
      if (fromAddress && !ourAddresses.includes(fromAddress)) {
        recipients.add(fromAddress)
      }
      
      if (email.to) {
        email.to.split(',').forEach((addr: string) => {
          const parsed = parseRecipientValue(addr)
          if (parsed && !ourAddresses.includes(parsed)) {
            recipients.add(parsed)
          }
        })
      }
      
      if (email.cc) {
        email.cc.split(',').forEach((addr: string) => {
          const parsed = parseRecipientValue(addr)
          if (parsed && !ourAddresses.includes(parsed)) {
            recipients.add(parsed)
          }
        })
      }
      
      const toRecipients = Array.from(recipients)
      const subj = email.subject?.startsWith("Re:") ? email.subject : `Re: ${email.subject || ""}`
      return { to: toRecipients.join(", "), subject: subj }
    }
    
    // forward
    const subj = email.subject?.startsWith("Fwd:") ? email.subject : `Fwd: ${email.subject || ""}`
    return { to: "", subject: subj }
  }, [email, intent, selectedFrom, availableAddresses])()

  // Build initial content with quoted HTML
  const getInitialContent = useCallback(() => {
    if ((intent === 'reply' || intent === 'replyAll' || intent === 'forward') && email?.body) {
      const sanitized = DOMPurify.sanitize(email.body, {
        USE_PROFILES: { html: true },
        FORBID_TAGS: ['script', 'style'],
        ALLOW_UNKNOWN_PROTOCOLS: false,
      })
      
      const attribution = intent === 'forward' 
        ? `<div><strong>---------- Forwarded message ---------</strong><br><strong>From:</strong> ${email.from}<br>${email.to ? `<strong>To:</strong> ${email.to}<br>` : ''}<strong>Subject:</strong> ${email.subject || ''}<br><strong>Date:</strong> ${email.time || ''}</div>`
        : `<div>On ${email.time || ''}, ${email.from} wrote:</div>`
      
      return `<p><br></p>${attribution}<blockquote class="gmail_quote" style="margin:0 0 0 .8ex;border-left:1px solid #ccc;padding-left:1ex">${sanitized}</blockquote>`
    }
    
    return '<p><br></p>'
  }, [intent, email])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Minimal configuration - only what's needed for email replies
        heading: false,
        codeBlock: false,
        horizontalRule: false,
        strike: false,
        code: false,
      }),
    ],
    content: getInitialContent(),
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[100px] p-2 text-sm break-words',
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-label': 'Reply message body',
      },
    },
    onCreate: ({ editor }) => {
      editor.commands.focus('start')
    },
  })

  const { autosaveStatus, flush } = useDraftAutosave({
    editor,
    from: selectedFrom,
    to,
    cc: undefined,
    bcc: undefined,
    subject,
    threadId,
    currentDraftId,
    debounceMs: 800,
    onDraftIdChange: setCurrentDraftId,
  })

  const handleSend = async () => {
    if (!editor || !selectedFrom || !to) return

    setIsSending(true)
    try {
      const fullHtml = editor.getHTML()
      
      // Convert HTML to plain text for text/plain part
      const htmlToText = (html: string) => {
        return html
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<\/p>/gi, '\n\n')
          .replace(/<[^>]+>/g, '')
          .trim()
      }
      
      const sendParams: {
        from: string
        to: string
        subject: string
        html: string
        text: string
        originalEmailId?: Id<"emails">
        draftId?: Id<"emails">
      } = {
        from: selectedFrom,
        to,
        subject,
        html: fullHtml,
        text: htmlToText(fullHtml),
      }

      if (intent === 'reply' || intent === 'replyAll') {
        sendParams.originalEmailId = email?.id as Id<"emails">
      }

      if (currentDraftId) {
        sendParams.draftId = currentDraftId as Id<"emails">
      }

      await sendEmail(sendParams)
      toast.success("Email sent successfully")
      onSend()
    } catch (error) {
      console.error("Failed to send email:", error)
      toast.error("Failed to send email")
    } finally {
      setIsSending(false)
    }
  }

  const handleCancel = async () => {
    try {
      await flush()
    } catch {}
    onCancel()
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-background p-3 animate-in slide-in-from-bottom-2 duration-200">
      {/* Header summary - compact */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="font-medium">To:</span>
          <span className="truncate">{to || "No recipients"}</span>
          {onOpenFullComposer && (
            <button
              type="button"
              onClick={onOpenFullComposer}
              className="ml-auto text-primary hover:underline whitespace-nowrap"
            >
              Edit headers
            </button>
          )}
        </div>
      </div>

      {/* Editor - minimal inline */}
      <div className="relative min-h-[100px] rounded-md border border-input bg-background focus-within:border-primary focus-within:ring-1 focus-within:ring-ring">
        <EditorContent editor={editor} />
      </div>

      {/* Actions - minimal */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {autosaveStatus === "saving" && "Saving..."}
          {autosaveStatus === "saved" && "Saved"}
          {autosaveStatus === "error" && "Save failed"}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={handleCancel}
            disabled={isSending}
          >
            <X className="h-3 w-3 mr-1" />
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-7 text-xs"
            onClick={handleSend}
            disabled={!selectedFrom || !to || !editor || isSending}
          >
            <Send className="h-3 w-3 mr-1" />
            {isSending ? "Sending..." : "Send"}
          </Button>
        </div>
      </div>
    </div>
  )
}
