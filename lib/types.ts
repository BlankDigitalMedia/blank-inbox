import type { Doc, Id } from "@/convex/_generated/dataModel"
import type { 
  GenericQueryCtx,
  GenericMutationCtx,
  GenericActionCtx,
} from "convex/server"
import type { DataModel } from "@/convex/_generated/dataModel"

// Convex context types
export type QueryCtx = GenericQueryCtx<DataModel>
export type MutationCtx = GenericMutationCtx<DataModel>
export type ActionCtx = GenericActionCtx<DataModel>

// Email document type from database
export type EmailDoc = Doc<"emails">

// Email type for UI components (transformed from EmailDoc)
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
  threadEmails: EmailDoc[]
}

// Webhook payload types
export interface ResendWebhookPayload {
  type?: string
  created_at?: string
  data?: {
    email_id?: string
    from?: string
    to?: string | string[]
    cc?: string | string[]
    bcc?: string | string[]
    subject?: string
    html?: string
    text?: string
    headers?: Record<string, string | string[]>
    message_id?: string
    in_reply_to?: string
    reply_to?: string
    envelope?: {
      from?: string
      to?: string | string[]
    }
  }
}

export interface InboundWebhookPayload {
  from?: string
  to?: string | string[]
  cc?: string | string[]
  bcc?: string | string[]
  subject?: string
  html?: string
  text?: string
  headers?: Record<string, string | string[]>
  message_id?: string
  in_reply_to?: string
  reply_to?: string
  email_id?: string
  envelope?: {
    from?: string
    to?: string | string[]
  }
}

export type WebhookPayload = ResendWebhookPayload | InboundWebhookPayload

// Email send result types
export interface ResendSendResult {
  id: string
}

export interface InboundSendResult {
  messageId?: string
  id?: string
}

// Component prop types (flexible for existing usage)
export interface EmailListProps {
  emails: Email[]
  selectedEmail: Email | null
  onSelectEmail: (email: Email) => void
  onToggleStar: (emailId: string) => void | Promise<void>
  onToggleArchive?: (emailId: string) => void | Promise<void>
  onToggleTrash?: (emailId: string) => void | Promise<void>
  scrollRef: React.RefObject<HTMLDivElement>
}

export interface EmailDetailProps {
  email: Email | null
  emptyMessage?: string
  showReply?: boolean
  showReplyAll?: boolean
  showForward?: boolean
  onToggleStar: (emailId: string) => void | Promise<void>
  onToggleArchive?: (emailId: string) => void | Promise<void>
  onToggleTrash?: (emailId: string) => void | Promise<void>
  onBack?: () => void
  contentRef?: React.Ref<HTMLDivElement>
}
