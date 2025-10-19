"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAction, useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Send, X, Save } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

export function ComposeEmail() {
  // Available from addresses - this could be moved to config or fetched from API
  const FROM_ADDRESSES = [
    { value: "hi@daveblank.dev", label: "hi@daveblank.dev" },
    { value: "info@daveblank.dev", label: "info@daveblank.dev" },
  ]
const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [draftId, setDraftId] = useState<string | null>(null)

  const sendEmail = useAction(api.emails.sendEmail)
  const saveDraft = useMutation(api.emails.saveDraft)
  const router = useRouter()
  const searchParams = useSearchParams()

  // Load draft if editing
  const draftParam = searchParams.get("draft")
  const draft = useQuery(api.emails.get, draftParam ? { id: draftParam as any } : "skip")

  // Load original email if replying
  const replyParam = searchParams.get("reply")
  const replyEmail = useQuery(api.emails.get, replyParam ? { id: replyParam as any } : "skip")

  useEffect(() => {
    if (draft && draft.draft) {
      setDraftId(draft._id)
      setFrom(draft.from || "")
      setTo(draft.to || "")
      setSubject(draft.subject || "")
      setBody(draft.body || "")
    }
  }, [draft])

  useEffect(() => {
   if (replyEmail && !draft) { // Only pre-fill if not editing a draft
     setTo(replyEmail.from || "")
     setSubject(replyEmail.subject?.startsWith("Re:") ? replyEmail.subject : `Re: ${replyEmail.subject || ""}`)
     setBody("") // Start with empty body for reply
     // Pre-select the appropriate from address based on which address received the email
     if (!from) {
         // If the original email was sent to one of our addresses, reply from that address
       const replyToAddress = replyEmail.to;
        const matchingFromAddress = FROM_ADDRESSES.find(addr => addr.value === replyToAddress);

        if (matchingFromAddress) {
          setFrom(matchingFromAddress.value);
        } else if (FROM_ADDRESSES.length > 0) {
          // Fallback to first available address
          setFrom(FROM_ADDRESSES[0].value);
        }
      }
  }
  }, [replyEmail, draft, from])

  const handleSend = async () => {
    if (!from || !to || !subject || !body) return

    setIsSending(true)
    try {
      // Convert plain text body to HTML (basic)
      const htmlBody = body.replace(/\n/g, "<br>")

      const sendParams: any = {
        from,
        to,
        subject,
        html: `<div>${htmlBody}</div>`,
        text: body,
      }

      if (draftId) {
        sendParams.draftId = draftId
      }

      await sendEmail(sendParams)

      // Redirect back to inbox
      router.push("/")
    } catch (error) {
      console.error("Failed to send email:", error)
      toast.error("Failed to send email")
    } finally {
      setIsSending(false)
    }
  }

  const handleSaveDraft = async () => {
    if (!from && !to && !subject && !body) return

    setIsSaving(true)
    try {
      const draftData: any = {
        from: from || "",
        to: to || "",
        subject: subject || "",
        body: body || "",
      }

      if (draftId) {
        draftData.id = draftId
      }

      const savedDraftId = await saveDraft(draftData)

      setDraftId(savedDraftId as string)

      // Show success toast
      toast.success("Draft saved successfully")

      // Navigate back to inbox
      router.push("/")
    } catch (error) {
      console.error("Failed to save draft:", error)
      toast.error("Failed to save draft")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-border">
        <h1 className="text-lg font-semibold">Compose</h1>
        <Button variant="ghost" size="icon" asChild>
          <Link href="/">
            <X className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      {/* Compose form */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto space-y-6">
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

          <div className="space-y-2">
            <Label htmlFor="to">To</Label>
            <Input
              id="to"
              type="email"
              placeholder="recipient@example.com"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              placeholder="Email subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="body">Message</Label>
            <Textarea
              id="body"
              placeholder="Write your message here..."
              className="min-h-[300px] resize-none"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={handleSaveDraft}
              disabled={isSaving || isSending}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {isSaving ? "Saving..." : "Save Draft"}
            </Button>
            <Button
              onClick={handleSend}
              disabled={!from || !to || !subject || !body || isSending || isSaving}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              {isSending ? "Sending..." : "Send"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
