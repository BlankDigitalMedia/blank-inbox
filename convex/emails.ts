import { action, mutation, query, internalMutation, internalAction } from "./_generated/server"
import { v } from "convex/values"
import { api, internal } from "./_generated/api"
import type { Id } from "./_generated/dataModel"
import { requireUserId } from "./lib/auth"

// Helper to check if field is false or undefined (for backward compatibility)
const isFalseOrUndef = (q: any, field: string) => 
  q.or(q.eq(q.field(field), false), q.eq(q.field(field), undefined))

export const list = query({
  args: {},
  handler: async (ctx) => {
    requireUserId(ctx);
    return await ctx.db
      .query("emails")
      .withIndex("by_receivedAt")
      .order("desc")
      .filter((q) => isFalseOrUndef(q, "archived"))
      .filter((q) => isFalseOrUndef(q, "trashed"))
      .filter((q) => isFalseOrUndef(q, "draft"))
      .filter((q) => isFalseOrUndef(q, "sent"))
      .collect()
  },
})

export const listDrafts = query({
  args: {},
  handler: async (ctx) => {
    requireUserId(ctx);
    return await ctx.db
      .query("emails")
      .withIndex("by_receivedAt")
      .order("desc")
      .filter((q) => q.eq(q.field("draft"), true))
      .collect()
  },
})

export const listArchived = query({
  args: {},
  handler: async (ctx) => {
    requireUserId(ctx);
    return await ctx.db
      .query("emails")
      .withIndex("by_receivedAt")
      .order("desc")
      .filter((q) => q.eq(q.field("archived"), true))
      .collect()
  },
})

export const listSent = query({
  args: {},
  handler: async (ctx) => {
    requireUserId(ctx);
    return await ctx.db
      .query("emails")
      .withIndex("by_receivedAt")
      .order("desc")
      .filter((q) => q.eq(q.field("sent"), true))
      .collect()
  },
})

export const listStarred = query({
  args: {},
  handler: async (ctx) => {
    requireUserId(ctx);
    return await ctx.db
      .query("emails")
      .withIndex("by_receivedAt")
      .order("desc")
      .filter((q) => q.eq(q.field("starred"), true))
      .filter((q) => isFalseOrUndef(q, "trashed"))
      .filter((q) => isFalseOrUndef(q, "draft"))
      .collect()
  },
})

export const contacts = query({
  args: {},
  handler: async (ctx) => {
    requireUserId(ctx);
    // Get all unique email addresses from sent emails
    const sentEmails = await ctx.db
      .query("emails")
      .filter((q) => q.eq(q.field("sent"), true))
      .filter((q) => isFalseOrUndef(q, "trashed"))
      .filter((q) => q.neq(q.field("to"), undefined))
      .collect()

    const contactMap = new Map<string, { address: string; name?: string; lastSeen: number; count: number }>()

    for (const email of sentEmails) {
      if (email.to) {
        const existing = contactMap.get(email.to)
        if (existing) {
          existing.count++
          existing.lastSeen = Math.max(existing.lastSeen, email.receivedAt)
        } else {
          contactMap.set(email.to, {
            address: email.to,
            name: undefined, // Could be extracted from email headers
            lastSeen: email.receivedAt,
            count: 1,
          })
        }
      }
    }

    return Array.from(contactMap.values()).sort((a, b) => b.lastSeen - a.lastSeen)
  },
})

export const listTrashed = query({
  args: {},
  handler: async (ctx) => {
    requireUserId(ctx);
    return await ctx.db
      .query("emails")
      .withIndex("by_receivedAt")
      .order("desc")
      .filter((q) => q.eq(q.field("trashed"), true))
      .collect()
  },
})

export const upsertFromInbound = internalMutation({
  args: {
    payload: v.any(),
  },
  handler: async (ctx, { payload }) => {
    // Extract email data from webhook payload
    const from = payload?.envelope?.from || payload?.from || ""
    const to = payload?.envelope?.to || payload?.to || ""
    const subject = payload?.subject || ""
    const messageId = payload?.message_id || payload?.id || ""
    const receivedAt = Date.now()

    // Create a preview from the subject or first line of text content
    const preview = subject.length > 100 ? subject.substring(0, 100) + "..." : subject

    // Insert the email record
    const docId = await ctx.db.insert("emails", {
      from,
      to,
      subject,
      preview,
      body: "", // Will be populated by fetchEmailBodyFromResend
      read: false,
      starred: false,
      archived: false,
      trashed: false,
      draft: false,
      sent: false,
      receivedAt,
      messageId,
    })

    return docId
  },
})

export const fetchEmailBodyFromResend = internalAction({
  args: {
    docId: v.id("emails"),
    emailId: v.string(),
    attempt: v.number(),
  },
  handler: async (ctx, { docId, emailId, attempt }) => {
    const resendApiKey = process.env.RESEND_API_KEY
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured")
      return
    }

    try {
      // Fetch email details from Resend API
      const response = await fetch(`https://api.resend.com/emails/${emailId}`, {
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
        },
      })

      if (!response.ok) {
        console.error(`Failed to fetch email ${emailId}: ${response.status}`)
        // Retry on 404, 429, and 5xx errors
        const shouldRetry = response.status === 404 || response.status === 429 || (response.status >= 500 && response.status < 600)
        if (shouldRetry && attempt < 3) {
          const delayMs = Math.min(15000, attempt * 5000)
          await ctx.scheduler.runAfter(delayMs, internal.emails.fetchEmailBodyFromResend, {
            docId,
            emailId,
            attempt: attempt + 1,
          })
        }
        return
      }

      const emailData = await response.json()

      // Update the email with the full body content
      await ctx.runMutation(internal.emails.updateBody, {
        docId,
        body: emailData.html || emailData.text || "",
      })

    } catch (error) {
      console.error("Error fetching Resend email body:", error)
      // If we haven't exceeded max attempts, retry
      if (attempt < 3) {
        const delayMs = Math.min(15000, attempt * 5000)
        await ctx.scheduler.runAfter(delayMs, internal.emails.fetchEmailBodyFromResend, {
          docId,
          emailId,
          attempt: attempt + 1,
        })
      }
    }
  },
})

export const updateBody = internalMutation({
  args: {
    docId: v.id("emails"),
    body: v.string(),
  },
  handler: async (ctx, { docId, body }) => {
    await ctx.db.patch(docId, { body })
  },
})

export const toggleStar = mutation({
  args: { id: v.id("emails") },
  handler: async (ctx, { id }) => {
    requireUserId(ctx);
    const email = await ctx.db.get(id)
    if (!email) throw new Error("Email not found")
    await ctx.db.patch(id, { starred: !email.starred })
  },
})

export const toggleArchive = mutation({
  args: { id: v.id("emails") },
  handler: async (ctx, { id }) => {
    requireUserId(ctx);
    const email = await ctx.db.get(id)
    if (!email) throw new Error("Email not found")
    await ctx.db.patch(id, { archived: !email.archived })
  },
})

export const toggleTrash = mutation({
  args: { id: v.id("emails") },
  handler: async (ctx, { id }) => {
    requireUserId(ctx);
    const email = await ctx.db.get(id)
    if (!email) throw new Error("Email not found")
    await ctx.db.patch(id, { trashed: !email.trashed })
  },
})

export const markRead = mutation({
  args: { id: v.id("emails") },
  handler: async (ctx, { id }) => {
    requireUserId(ctx);
    await ctx.db.patch(id, { read: true })
  },
})

export const deleteEmail = mutation({
  args: { id: v.id("emails") },
  handler: async (ctx, { id }) => {
    requireUserId(ctx);
    await ctx.db.delete(id)
  },
})

// Alias for backward compatibility
export const deleteDraft = deleteEmail

export const storeSentEmail = mutation({
  args: {
    from: v.string(),
    to: v.string(),
    cc: v.optional(v.string()),
    bcc: v.optional(v.string()),
    subject: v.string(),
    html: v.string(),
    text: v.string(),
    messageId: v.string(),
    originalEmailId: v.optional(v.id("emails")),
  },
  handler: async (ctx, { from, to, cc, bcc, subject, html, text, messageId, originalEmailId }) => {
    requireUserId(ctx);
    const docId = await ctx.db.insert("emails", {
      from,
      to,
      cc,
      bcc,
      subject,
      preview: text.length > 100 ? text.substring(0, 100) + "..." : text,
      body: html,
      read: true,
      starred: false,
      archived: false,
      trashed: false,
      draft: false,
      sent: true,
      receivedAt: Date.now(),
      messageId,
      threadId: originalEmailId?.toString(),
    })
    return docId
  },
})

export const sendEmail = action({
  args: {
    from: v.string(),
    to: v.string(),
    cc: v.optional(v.string()),
    bcc: v.optional(v.string()),
    subject: v.string(),
    html: v.string(),
    text: v.string(),
    originalEmailId: v.optional(v.id("emails")),
    draftId: v.optional(v.id("emails")),
  },
  handler: async (ctx, { from, to, cc, bcc, subject, html, text, originalEmailId, draftId }): Promise<{ success: boolean; messageId: string; docId: Id<"emails"> }> => {
    requireUserId(ctx);
    const resendApiKey = process.env.RESEND_API_KEY
    const inboundApiKey = process.env.NEXT_INBOUND_API_KEY
    
    if (!resendApiKey && !inboundApiKey) {
      throw new Error("No email provider configured. Set RESEND_API_KEY or NEXT_INBOUND_API_KEY")
    }

    let messageId: string | undefined
    let sendError: Error | null = null

    // Try Resend first if available
    if (resendApiKey) {
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from,
            to: [to],
            cc: cc ? [cc] : undefined,
            bcc: bcc ? [bcc] : undefined,
            subject,
            html,
            text,
          }),
        })

        if (!response.ok) {
          const error = await response.text()
          throw new Error(`Resend API error: ${error}`)
        }

        const result = await response.json()
        messageId = result.id
      } catch (error) {
        sendError = error as Error
        console.error("Resend send failed:", error)
        
        // If inbound.new is not available, throw the error
        if (!inboundApiKey) {
          throw new Error(`Failed to send email via Resend: ${sendError.message}`)
        }
      }
    }

    // Try inbound.new if Resend failed or wasn't available
    if (!messageId && inboundApiKey) {
      try {
        const { Inbound } = await import("@inboundemail/sdk")
        const inbound = new Inbound(inboundApiKey)

        const result = await inbound.send({
          from,
          to,
          cc,
          bcc,
          subject,
          html,
          text,
        })

        messageId = (result as any).messageId || (result as any).id || `inbound-${Date.now()}`
      } catch (error) {
        const inboundError = error as Error
        console.error("inbound.new send failed:", error)
        
        // If both providers failed, throw combined error
        if (sendError) {
          throw new Error(`Failed to send email. Resend: ${sendError.message}. inbound.new: ${inboundError.message}`)
        } else {
          throw new Error(`Failed to send email via inbound.new: ${inboundError.message}`)
        }
      }
    }

    if (!messageId) {
      throw new Error("Failed to send email via any provider")
    }

    // Store the sent email record
    const docId = await ctx.runMutation(api.emails.storeSentEmail, {
      from,
      to,
      cc,
      bcc,
      subject,
      html,
      text,
      messageId,
      originalEmailId,
    })

    // If this was from a draft, delete the draft
    if (draftId) {
      await ctx.runMutation(api.emails.deleteEmail, { id: draftId })
    }

    return { success: true, messageId, docId }
  },
})

export const saveDraft = mutation({
  args: {
    id: v.optional(v.id("emails")),
    from: v.string(),
    to: v.optional(v.string()),
    cc: v.optional(v.string()),
    bcc: v.optional(v.string()),
    subject: v.string(),
    body: v.string(),
    threadId: v.optional(v.string()),
  },
  handler: async (ctx, { id, from, to, cc, bcc, subject, body, threadId }) => {
    requireUserId(ctx);
    const timestamp = Date.now()
    const preview = body.length > 100 ? body.substring(0, 100) + "..." : body

    if (id) {
      await ctx.db.patch(id, {
        from,
        to,
        cc,
        bcc,
        subject,
        preview,
        body,
        threadId,
        receivedAt: timestamp,
      })
      return id
    }

    return await ctx.db.insert("emails", {
      from,
      to,
      cc,
      bcc,
      subject,
      preview,
      body,
      threadId,
      read: true,
      starred: false,
      archived: false,
      trashed: false,
      draft: true,
      sent: false,
      receivedAt: timestamp,
    })
  },
})

