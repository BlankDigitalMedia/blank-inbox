"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useAction, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Send, X } from "lucide-react"
import { toast } from "sonner"
import { cn, sanitizeHtml } from "@/lib/utils"
import { useCompose } from "@/app/providers/compose-provider"
import type { Email } from "@/components/email-page"
import DOMPurify from 'dompurify'

const FROM_ADDRESSES = [
  { value: "hi@daveblank.dev", label: "hi@daveblank.dev" },
  { value: "info@daveblank.dev", label: "info@daveblank.dev" },
]

interface ComposerProps {
  mode: "inline" | "modal"
  intent: "new" | "reply" | "replyAll" | "forward"
  email?: Email
  threadId?: string
  draftId?: string
  windowId?: string
  initialFrom?: string
  initialTo?: string
  initialCc?: string
  initialBcc?: string
  initialSubject?: string
  initialBody?: string
  onSend: () => void
  onCancel: () => void
}

export function Composer({
  mode,
  intent,
  email,
  threadId,
  draftId: initialDraftId,
  windowId,
  initialFrom,
  initialTo,
  initialCc,
  initialBcc,
  initialSubject,
  initialBody,
  onSend,
  onCancel,
}: ComposerProps) {
  const [from, setFrom] = useState(initialFrom || email?.from || "")
  const [to, setTo] = useState(initialTo || email?.to || "")
  const [cc, setCc] = useState(initialCc || email?.cc || "")
  const [bcc, setBcc] = useState(initialBcc || email?.bcc || "")
  const [subject, setSubject] = useState(initialSubject || email?.subject || "")
  const [isSending, setIsSending] = useState(false)
  const [showCc, setShowCc] = useState(false)
  const [showBcc, setShowBcc] = useState(false)
  const [autosaveStatus, setAutosaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [currentDraftId, setCurrentDraftId] = useState<string | undefined>(initialDraftId)
  const containerRef = useRef<HTMLDivElement>(null)
  const inflightRef = useRef<Promise<any> | null>(null)
  const queuedRef = useRef(false)
  const debounced = useRef<number | null>(null)

  const { update } = useCompose()
  const sendEmail = useAction(api.emails.sendEmail)
  const saveDraftMutation = useMutation(api.emails.saveDraft)

  // Build initial editor content with quoted HTML for replies/forwards
  const getInitialContent = useCallback(() => {
    // If we have initialBody (from props), use it
    if (initialBody) {
      return initialBody
    }

    // If we have a draftId and email body (loading existing draft), use the saved body
    if (initialDraftId && email?.body) {
      return email.body
    }

    // For replies/forwards, build quoted content
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
  }, [intent, email, initialBody, initialDraftId])

  const editor = useEditor({
    extensions: [StarterKit],
    content: getInitialContent(),
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none h-full min-h-[200px] p-3 border rounded-md bg-background break-words',
      },
    },
    onCreate: ({ editor }) => {
      editor.commands.focus('start')
    },
  })

  useEffect(() => {
    if (intent === 'new' && !from) {
      setFrom(FROM_ADDRESSES[0]?.value || "")
    }
  }, [intent, from])

  useEffect(() => {
    if (!email) return

    const receivedTo = email.to?.split(',')[0]?.trim()
    const matchingFrom = FROM_ADDRESSES.find(addr => addr.value === receivedTo)
    setFrom(matchingFrom?.value || FROM_ADDRESSES[0]?.value || "")

    if (intent === 'reply') {
      setTo(email.from || "")
      setSubject(email.subject?.startsWith("Re:") ? email.subject : `Re: ${email.subject || ""}`)
    } else if (intent === 'replyAll') {
      const recipients = new Set<string>()
      const ourAddresses = FROM_ADDRESSES.map(addr => addr.value)
      
      if (email.from && !ourAddresses.includes(email.from)) {
        recipients.add(email.from)
      }
      
      if (email.to) {
        email.to.split(',').forEach(addr => {
          const trimmed = addr.trim()
          if (!ourAddresses.includes(trimmed)) {
            recipients.add(trimmed)
          }
        })
      }
      
      if (email.cc) {
        email.cc.split(',').forEach(addr => {
          const trimmed = addr.trim()
          if (!ourAddresses.includes(trimmed)) {
            recipients.add(trimmed)
          }
        })
      }
      
      setTo(Array.from(recipients).join(', '))
      setSubject(email.subject?.startsWith("Re:") ? email.subject : `Re: ${email.subject || ""}`)
    } else if (intent === 'forward') {
      setTo("")
      setSubject(email.subject?.startsWith("Fwd:") ? email.subject : `Fwd: ${email.subject || ""}`)
    }
  }, [email, intent])

  useEffect(() => {
    if (mode === 'inline' && containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [mode])

  // Autosave logic
  const performSave = useCallback(async () => {
    if (inflightRef.current || !editor) {
      queuedRef.current = true
      return
    }
    
    const body = editor.getHTML()
    
    // Convert HTML to text for preview
    const htmlToText = (html: string) => {
      return html
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<[^>]+>/g, '')
        .trim()
    }
    
    setAutosaveStatus("saving")
    const params = {
      id: currentDraftId as any,
      from,
      to: to || undefined,
      cc: cc || undefined,
      bcc: bcc || undefined,
      subject,
      body,
      threadId,
    }
    
    try {
      const p = saveDraftMutation(params)
      inflightRef.current = p
      const savedId = await p
      inflightRef.current = null
      
      if (!currentDraftId && savedId) {
        setCurrentDraftId(savedId)
        if (windowId) update(windowId, { draftId: savedId })
      }
      
      setAutosaveStatus("saved")
      setTimeout(() => setAutosaveStatus("idle"), 1200)
      
      if (queuedRef.current) {
        queuedRef.current = false
        performSave()
      }
    } catch (e) {
      inflightRef.current = null
      setAutosaveStatus("error")
      console.error("Autosave failed:", e)
    }
  }, [from, to, cc, bcc, subject, threadId, currentDraftId, saveDraftMutation, windowId, update, editor])

  const handleBlur = useCallback(() => {
    if (!editor) return
    const body = editor.getHTML()
    const hasContent = (from && intent === "new") || to || cc || bcc || subject || body
    if (!hasContent) return
    performSave()
  }, [from, to, cc, bcc, subject, intent, performSave, editor])

  const flush = useCallback(async () => {
    if (debounced.current) {
      clearTimeout(debounced.current)
      debounced.current = null
    }
    await performSave()
  }, [performSave])

  // Update window title from subject
  const prevTitleRef = useRef<string>("")
  
  useEffect(() => {
    if (!windowId) return
    
    const maxLen = 30
    const trimmed = subject?.trim() || ""
    let newTitle = ""
    
    if (trimmed) {
      newTitle = trimmed.length > maxLen ? trimmed.slice(0, maxLen) + "..." : trimmed
    } else {
      if (intent === "forward") newTitle = "Forward"
      else if (intent === "replyAll") newTitle = "Reply all"
      else if (intent === "reply") newTitle = "Reply"
      else newTitle = "New message"
    }
    
    if (newTitle !== prevTitleRef.current) {
      prevTitleRef.current = newTitle
      update(windowId, { title: newTitle })
    }
  }, [windowId, intent, subject, update])

  const handleSend = async () => {
    if (!editor || !from || !to || !subject) return

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
      
      const sendParams: any = {
        from,
        to,
        cc: cc || undefined,
        bcc: bcc || undefined,
        subject,
        html: fullHtml,
        text: htmlToText(fullHtml),
      }

      if (intent === 'reply' || intent === 'replyAll') {
        // email.id is the Convex _id string, cast it properly
        sendParams.originalEmailId = email?.id as any
      }

      if (currentDraftId) {
        sendParams.draftId = currentDraftId
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

  const isInline = mode === 'inline'
  const isReply = intent === 'reply' || intent === 'replyAll' || intent === 'forward'

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex h-full flex-col",
        isInline && isReply && "mt-6 p-4 border border-border rounded-lg bg-muted/50 animate-in slide-in-from-bottom-2 duration-300"
      )}
    >
      <div className="shrink-0 space-y-3 px-4 py-3">
      {intent === 'new' && (
        <div className="space-y-2">
          <Label htmlFor="from">From</Label>
          <Select value={from} onValueChange={setFrom}>
            <SelectTrigger>
              <SelectValue placeholder="Select sender email" />
            </SelectTrigger>
            <SelectContent>
              {FROM_ADDRESSES.map((address) => (
                <SelectItem key={address.value} value={address.value}>
                  {address.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="to">To</Label>
          {intent === 'new' && (
            <div className="flex gap-2 text-xs">
              {!showCc && (
                <button
                  type="button"
                  onClick={() => setShowCc(true)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Cc
                </button>
              )}
              {!showBcc && (
                <button
                  type="button"
                  onClick={() => setShowBcc(true)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Bcc
                </button>
              )}
            </div>
          )}
        </div>
        <Input
          id="to"
          type="email"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          onBlur={handleBlur}
          placeholder="recipient@example.com"
        />
      </div>

      {(showCc || cc) && intent === 'new' && (
        <div className="space-y-2">
          <Label htmlFor="cc">CC</Label>
          <Input
            id="cc"
            type="email"
            value={cc}
            onChange={(e) => setCc(e.target.value)}
            onBlur={handleBlur}
            placeholder="cc@example.com"
          />
        </div>
      )}

      {(showBcc || bcc) && intent === 'new' && (
        <div className="space-y-2">
          <Label htmlFor="bcc">BCC</Label>
          <Input
            id="bcc"
            type="email"
            value={bcc}
            onChange={(e) => setBcc(e.target.value)}
            onBlur={handleBlur}
            placeholder="bcc@example.com"
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="subject">Subject</Label>
        <Input
          id="subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          onBlur={handleBlur}
          placeholder="Email subject"
        />
      </div>
      </div>

      <div className="flex-1 min-h-0 px-4 pb-3">
        <div className="h-full overflow-y-auto">
          <EditorContent editor={editor} />
        </div>
      </div>

      <div className="shrink-0 flex items-center justify-end gap-2 border-t bg-background px-4 py-2">
        <div className="mr-auto text-xs text-muted-foreground">
          {autosaveStatus === "saving" && "Saving..."}
          {autosaveStatus === "saved" && "Saved"}
          {autosaveStatus === "error" && "Save failed. Retrying on next change..."}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            try {
              await flush()
            } catch {}
            onCancel()
          }}
          disabled={isSending}
        >
          <X className="h-4 w-4 mr-2" />
          Close
        </Button>
        <Button
          size="sm"
          onClick={handleSend}
          disabled={!from || !to || !subject || !editor || isSending}
        >
          <Send className="h-4 w-4 mr-2" />
          {isSending ? "Sending..." : "Send"}
        </Button>
      </div>
    </div>
  )
}
