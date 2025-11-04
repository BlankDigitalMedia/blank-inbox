import { z } from "zod"
import { Id } from "@/convex/_generated/dataModel"

// Email address validation helper
const emailString = z.string().email()
const emailListString = z.string().refine(
  (val) => {
    if (!val.trim()) return true; // Allow empty string
    const emails = val.split(',').map(e => e.trim());
    return emails.every(email => z.string().email().safeParse(email).success);
  },
  { message: "Must be valid email address(es), comma-separated" }
)

// Common email headers schema
const emailHeadersSchema = z.record(z.union([z.string(), z.array(z.string())]))

// Resend webhook payload format
export const resendWebhookSchema = z.object({
  type: z.string().optional(),
  created_at: z.string().optional(),
  data: z.object({
    email_id: z.string().optional(),
    from: z.string().optional(),
    to: z.union([z.string(), z.array(z.string())]).optional(),
    cc: z.union([z.string(), z.array(z.string())]).optional(),
    bcc: z.union([z.string(), z.array(z.string())]).optional(),
    subject: z.string().optional(),
    html: z.string().optional(),
    text: z.string().optional(),
    headers: emailHeadersSchema.optional(),
    envelope: z.object({
      from: z.string().optional(),
      to: z.union([z.string(), z.array(z.string())]).optional(),
    }).optional(),
    message_id: z.string().optional(),
    id: z.string().optional(),
    in_reply_to: z.string().optional(),
    reply_to: z.string().optional(),
    references: z.union([z.string(), z.array(z.string())]).optional(),
    date: z.string().optional(),
  }),
})

// inbound.new webhook payload format
export const inboundWebhookSchema = z.object({
  email_id: z.string().optional(),
  from: z.string().optional(),
  to: z.union([z.string(), z.array(z.string())]).optional(),
  cc: z.union([z.string(), z.array(z.string())]).optional(),
  bcc: z.union([z.string(), z.array(z.string())]).optional(),
  subject: z.string().optional(),
  html: z.string().optional(),
  text: z.string().optional(),
  headers: emailHeadersSchema.optional(),
  envelope: z.object({
    from: z.string().optional(),
    to: z.union([z.string(), z.array(z.string())]).optional(),
  }).optional(),
  message_id: z.string().optional(),
  id: z.string().optional(),
  in_reply_to: z.string().optional(),
  reply_to: z.string().optional(),
  references: z.union([z.string(), z.array(z.string())]).optional(),
  created_at: z.string().optional(),
  date: z.string().optional(),
})

// Union type for webhook payloads (handles both formats)
export const webhookPayloadSchema = z.union([
  resendWebhookSchema,
  inboundWebhookSchema,
])

// Email composition/sending schema
export const sendEmailSchema = z.object({
  from: emailString,
  to: emailListString,
  cc: emailListString.optional(),
  bcc: emailListString.optional(),
  subject: z.string(),
  html: z.string(),
  text: z.string(),
  originalEmailId: z.custom<Id<"emails">>().optional(),
  draftId: z.custom<Id<"emails">>().optional(),
})

// Draft save schema
export const saveDraftSchema = z.object({
  id: z.custom<Id<"emails">>().optional(),
  from: z.string(),
  to: z.string().optional(),
  cc: z.string().optional(),
  bcc: z.string().optional(),
  subject: z.string(),
  body: z.string(),
  threadId: z.string().optional(),
})

// Store sent email schema
export const storeSentEmailSchema = z.object({
  from: z.string(),
  to: z.string(),
  cc: z.string().optional(),
  bcc: z.string().optional(),
  subject: z.string(),
  html: z.string(),
  text: z.string(),
  messageId: z.string(),
  originalEmailId: z.custom<Id<"emails">>().optional(),
  originalEmail: z.object({
    messageId: z.string().optional(),
    threadId: z.string().optional(),
    references: z.array(z.string()).optional(),
  }).optional(),
})

// Email ID parameter schema
export const emailIdSchema = z.object({
  id: z.custom<Id<"emails">>(),
})

// Query pagination schema (for future use)
export const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().min(1).max(100).optional(),
})

// Type exports inferred from schemas
export type ResendWebhook = z.infer<typeof resendWebhookSchema>
export type InboundWebhook = z.infer<typeof inboundWebhookSchema>
export type WebhookPayload = z.infer<typeof webhookPayloadSchema>
export type SendEmailInput = z.infer<typeof sendEmailSchema>
export type SaveDraftInput = z.infer<typeof saveDraftSchema>
export type StoreSentEmailInput = z.infer<typeof storeSentEmailSchema>
export type EmailIdInput = z.infer<typeof emailIdSchema>
export type PaginationInput = z.infer<typeof paginationSchema>

// Contact schemas
export const contactIdSchema = z.object({
  id: z.custom<Id<"contacts">>(),
})

export const upsertContactSchema = z.object({
  primaryEmail: emailString,
  name: z.string().max(500).optional(),
  company: z.string().max(500).optional(),
  title: z.string().max(500).optional(),
  avatarUrl: z.string().url().max(2000).optional(),
  notes: z.string().max(10000).optional(),
  tags: z.array(z.string().max(100)).max(50).optional(),
})

export const updateContactSchema = z.object({
  id: z.custom<Id<"contacts">>(),
  name: z.string().max(500).optional(),
  company: z.string().max(500).optional(),
  title: z.string().max(500).optional(),
  avatarUrl: z.string().url().max(2000).optional(),
  notes: z.string().max(10000).optional(),
  tags: z.array(z.string().max(100)).max(50).optional(),
})

export const listContactsSchema = z.object({
  search: z.string().max(500).optional(),
  tag: z.string().max(100).optional(),
  cursor: z.string().optional(),
  limit: z.number().min(1).max(100).default(100),
})

export const getContactByEmailSchema = z.object({
  email: emailString,
})

export const mergeContactsSchema = z.object({
  sourceId: z.custom<Id<"contacts">>(),
  targetId: z.custom<Id<"contacts">>(),
})

export const touchLastContactedSchema = z.object({
  email: emailString,
  ts: z.number().optional(),
})

export type ContactIdInput = z.infer<typeof contactIdSchema>
export type UpsertContactInput = z.infer<typeof upsertContactSchema>
export type UpdateContactInput = z.infer<typeof updateContactSchema>
export type ListContactsInput = z.infer<typeof listContactsSchema>
export type GetContactByEmailInput = z.infer<typeof getContactByEmailSchema>
export type MergeContactsInput = z.infer<typeof mergeContactsSchema>
export type TouchLastContactedInput = z.infer<typeof touchLastContactedSchema>
