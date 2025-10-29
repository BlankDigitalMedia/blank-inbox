import { query, mutation, action, internalMutation, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { Inbound } from "@inboundemail/sdk";

const ADDRESS_DELIMITER_REGEX = /[,;\n]+/;

type ContactAccumulator = {
  address: string;
  name?: string;
  lastSeen: number;
  count: number;
};

const parseContactToken = (token: string) => {
  const trimmed = token.trim();
  if (!trimmed) return null;

  const angleMatch = trimmed.match(/^(?:"?([^"<]+?)"?\s*)?<([^>]+)>$/);
  if (angleMatch) {
    const address = angleMatch[2]?.trim();
    if (!address || !address.includes("@")) return null;
    const name = angleMatch[1]?.trim();
    return { address, name };
  }

  const sanitized = trimmed.replace(/^mailto:/i, "").replace(/[<>]/g, "").trim();
  if (!sanitized || !sanitized.includes("@")) return null;
  return { address: sanitized };
};

const registerContacts = (
  map: Map<string, ContactAccumulator>,
  raw: string | undefined,
  receivedAt: number
) => {
  if (!raw) return;
  const tokens = raw.split(ADDRESS_DELIMITER_REGEX);
  for (const token of tokens) {
    const parsed = parseContactToken(token);
    if (!parsed) continue;
    const key = parsed.address.toLowerCase();
    const current = map.get(key);
    if (current) {
      current.count += 1;
      if (parsed.name && !current.name) current.name = parsed.name;
      if (receivedAt > current.lastSeen) current.lastSeen = receivedAt;
    } else {
      map.set(key, {
        address: parsed.address,
        name: parsed.name,
        lastSeen: receivedAt,
        count: 1,
      });
    }
  }
};

export const list = query({
  args: {},
  handler: async (ctx) => {
    const emails = await ctx.db
      .query("emails")
      .withIndex("by_receivedAt")
      .filter((q) => q.neq(q.field("archived"), true))
      .filter((q) => q.neq(q.field("trashed"), true))
      .filter((q) => q.neq(q.field("draft"), true))
      .filter((q) => q.neq(q.field("category"), "sent"))
      .order("desc")
      .collect();

    // Explicitly sort by receivedAt in descending order (most recent first)
    return emails.sort((a, b) => b.receivedAt - a.receivedAt);
  },
});

export const unreadCount = query({
  args: {},
  handler: async (ctx) => {
    const unreadEmails = await ctx.db
      .query("emails")
      .withIndex("by_receivedAt")
      .filter((q) => q.neq(q.field("archived"), true))
      .filter((q) => q.neq(q.field("trashed"), true))
      .filter((q) => q.neq(q.field("draft"), true))
      .filter((q) => q.neq(q.field("category"), "sent"))
      .filter((q) => q.eq(q.field("read"), false))
      .collect();
    return unreadEmails.length;
  },
});

export const listArchived = query({
  args: {},
  handler: async (ctx) => {
    const emails = await ctx.db
      .query("emails")
      .withIndex("by_receivedAt")
      .filter((q) => q.eq(q.field("archived"), true))
      .filter((q) => q.neq(q.field("trashed"), true))
      .order("desc")
      .collect();

    // Explicitly sort by receivedAt in descending order (most recent first)
    return emails.sort((a, b) => b.receivedAt - a.receivedAt);
  },
});

export const listStarred = query({
  args: {},
  handler: async (ctx) => {
    const emails = await ctx.db
      .query("emails")
      .withIndex("by_receivedAt")
      .filter((q) => q.eq(q.field("starred"), true))
      .filter((q) => q.neq(q.field("trashed"), true))
      .filter((q) => q.neq(q.field("draft"), true))
      .order("desc")
      .collect();

    // Explicitly sort by receivedAt in descending order (most recent first)
    return emails.sort((a, b) => b.receivedAt - a.receivedAt);
  },
});

export const listSent = query({
  args: {},
  handler: async (ctx) => {
    const emails = await ctx.db
      .query("emails")
      .withIndex("by_receivedAt")
      .filter((q) => q.eq(q.field("category"), "sent"))
      .filter((q) => q.neq(q.field("trashed"), true))
      .order("desc")
      .collect();

    // Explicitly sort by receivedAt in descending order (most recent first)
    return emails.sort((a, b) => b.receivedAt - a.receivedAt);
  },
});

export const listTrashed = query({
  args: {},
  handler: async (ctx) => {
    const emails = await ctx.db
      .query("emails")
      .withIndex("by_receivedAt")
      .filter((q) => q.eq(q.field("trashed"), true))
      .order("desc")
      .collect();

    // Explicitly sort by receivedAt in descending order (most recent first)
    return emails.sort((a, b) => b.receivedAt - a.receivedAt);
  },
});

export const listDrafts = query({
  args: {},
  handler: async (ctx) => {
    const drafts = await ctx.db
      .query("emails")
      .withIndex("by_receivedAt")
      .filter((q) => q.eq(q.field("draft"), true))
      .filter((q) => q.neq(q.field("trashed"), true))
      .order("desc")
      .collect();

    // Explicitly sort by receivedAt in descending order (most recent first)
    return drafts.sort((a, b) => b.receivedAt - a.receivedAt);
  },
});

export const get = query({
  args: { id: v.id("emails") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

export const toggleStar = mutation({
  args: { id: v.id("emails") },
  handler: async (ctx, { id }) => {
    const email = await ctx.db.get(id);
    if (!email) return;
    await ctx.db.patch(id, { starred: !email.starred });
  },
});

export const markRead = mutation({
  args: { id: v.id("emails") },
  handler: async (ctx, { id }) => {
    const email = await ctx.db.get(id);
    if (!email) return;
    if (!email.read) {
      await ctx.db.patch(id, { read: true });
    }
  },
});

export const toggleArchive = mutation({
  args: { id: v.id("emails") },
  handler: async (ctx, { id }) => {
    const email = await ctx.db.get(id);
    if (!email) return;
    await ctx.db.patch(id, { archived: !(email.archived ?? false) });
  },
});

export const toggleTrash = mutation({
  args: { id: v.id("emails") },
  handler: async (ctx, { id }) => {
    const email = await ctx.db.get(id);
    if (!email) return;
    await ctx.db.patch(id, { trashed: !(email.trashed ?? false) });
  },
});

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
    const preview = body.slice(0, 120) || subject;
    const receivedAt = Date.now();

    if (id) {
      // Update existing draft
      await ctx.db.patch(id, {
        from,
        to,
        cc,
        bcc,
        subject,
        body,
        preview,
        receivedAt,
        threadId,
      });
      return id;
    } else {
      // Create new draft
      return await ctx.db.insert("emails", {
        from,
        to,
        cc,
        bcc,
        subject,
        preview,
        body,
        read: true, // Drafts are considered read
        starred: false,
        archived: false,
        trashed: false,
        draft: true,
        receivedAt,
        threadId,
        category: "draft",
      });
    }
  },
});

export const deleteDraft = mutation({
  args: { id: v.id("emails") },
  handler: async (ctx, { id }) => {
    const draft = await ctx.db.get(id);
    if (!draft || !draft.draft) return;
    await ctx.db.delete(id);
  },
});

export const upsertFromInbound = internalMutation({
  args: { payload: v.any() },
  handler: async (ctx, { payload }) => {
    // Support both Resend and inbound.new webhook formats
    // Resend nests email data under 'data' with type: "email.received"
    const isResendWebhook = payload?.type === "email.received" && payload?.data;
    const p = isResendWebhook ? payload.data : (payload?.email || payload);
    
    // Detect Resend format: has email_id or message_id with from/to fields
    const isResend = isResendWebhook || 
                     (typeof p?.email_id === "string" || typeof p?.message_id === "string");

    let from: string;
    let to: string | undefined;
    let cc: string | undefined;
    let bcc: string | undefined;
    let subject: string;
    let body: string;
    let preview: string;
    let messageId: string | undefined;
    let threadId: string | undefined;
    let receivedAt: number;

    if (isResend) {
      // Parse Resend webhook format
      from = p.from || "Unknown";
      
      // Handle to field - can be array or string
      if (Array.isArray(p.to)) {
        to = p.to.join(", ");
      } else if (typeof p.to === "string") {
        to = p.to;
      } else {
        to = undefined;
      }
      
      // Handle cc/bcc arrays
      cc = Array.isArray(p.cc) && p.cc.length > 0 ? p.cc.join(", ") : undefined;
      bcc = Array.isArray(p.bcc) && p.bcc.length > 0 ? p.bcc.join(", ") : undefined;
      
      subject = p.subject || "(no subject)";
      
      // Resend webhook may not include html/text in initial notification
      // Check for html, text, html_body, text_body, or body fields
      body = p.html || p.html_body || p.text || p.text_body || p.body || "";
      preview = p.text?.slice(0, 120) || p.text_body?.slice(0, 120) || body.slice(0, 120) || subject;
      
      // Resend uses email_id and message_id
      messageId = p.message_id || p.email_id;
      threadId = undefined; // Resend doesn't provide threadId in webhook
      
      // Parse timestamp - Resend uses created_at in various formats
      receivedAt = p.created_at ? Date.parse(p.created_at) : Date.now();
    } else {
      // Parse inbound.new webhook format (legacy support)
      from = p?.from?.text || p?.from || "Unknown";
      to = p?.to?.text || p?.to || p?.recipient || undefined;

      // Extract CC/BCC
      cc = p?.cc?.text || p?.cc;
      bcc = p?.bcc?.text || p?.bcc;

      // Handle array formats
      if (Array.isArray(p?.cc)) {
        cc = p.cc.map((item: any) => item?.email || item?.address || item).filter(Boolean).join(', ');
      }
      if (Array.isArray(p?.bcc)) {
        bcc = p.bcc.map((item: any) => item?.email || item?.address || item).filter(Boolean).join(', ');
      }

      // Handle parsedData if it contains CC/BCC info
      if (p?.parsedData?.cc && !cc) {
        cc = Array.isArray(p.parsedData.cc)
          ? p.parsedData.cc.join(', ')
          : p.parsedData.cc;
      }
      if (p?.parsedData?.bcc && !bcc) {
        bcc = Array.isArray(p.parsedData.bcc)
          ? p.parsedData.bcc.join(', ')
          : p.parsedData.bcc;
      }

      subject = p?.subject || "(no subject)";
      body = p?.cleanedContent?.html || p?.cleanedContent?.text || p?.html || p?.text || "";
      preview = p?.cleanedContent?.text?.slice(0, 120) || body.slice(0, 120) || subject;
      messageId = p?.messageId || p?.id;
      threadId = p?.threadId;
      receivedAt = p?.receivedAt ? Number(new Date(p.receivedAt)) :
                   p?.date ? Number(new Date(p.date)) : Date.now();
    }

    // Idempotency on messageId when present
    if (messageId) {
      const existing = await ctx.db
        .query("emails")
        .withIndex("by_receivedAt")
        .filter((q) => q.eq(q.field("messageId"), messageId))
        .first();
      if (existing) return existing._id;
    }

    return await ctx.db.insert("emails", {
      from,
      to,
      cc,
      bcc,
      subject,
      preview,
      body,
      read: false,
      starred: false,
      archived: false,
      trashed: false,
      receivedAt,
      messageId,
      threadId,
      category: "inbox",
    });
  },
});


export const storeSentEmail = mutation({
  args: {
    from: v.string(),
    to: v.string(),
    cc: v.optional(v.string()),
    bcc: v.optional(v.string()),
    subject: v.string(),
    preview: v.string(),
    body: v.string(),
    receivedAt: v.number(),
    messageId: v.string(),
    threadId: v.optional(v.string()),
  },
  handler: async (ctx, { from, to, cc, bcc, subject, preview, body, receivedAt, messageId, threadId }) => {
    return await ctx.db.insert("emails", {
    from,
    to,
    cc,
    bcc,
    subject,
    preview,
    body,
    read: true, // Sent emails are read by default
    starred: false,
    archived: false,
    trashed: false,
    receivedAt,
    messageId,
    threadId,
      category: "sent",
    });
  },
});

export const sendEmail = action({
  args: {
    draftId: v.optional(v.id("emails")),
    originalEmailId: v.optional(v.id("emails")),
    from: v.string(),
    to: v.string(),
    cc: v.optional(v.string()),
    bcc: v.optional(v.string()),
    subject: v.string(),
    html: v.string(),
    text: v.optional(v.string()),
  },
  handler: async (ctx, { draftId, originalEmailId, from, to, cc, bcc, subject, html, text }): Promise<any> => {
    const apiKey = process.env.NEXT_INBOUND_API_KEY;
    if (!apiKey) throw new Error("NEXT_INBOUND_API_KEY not set");

    const inbound = new Inbound(apiKey);

    let sentData;
    let threadId: string | undefined;


      // Regular send
      const sendParams: any = {
        from,
        to,
        subject,
        html,
        text,
      };
      if (cc) sendParams.cc = cc;
      if (bcc) sendParams.bcc = bcc;

      const { data, error } = await inbound.email.send(sendParams);
      if (error) {
        throw new Error(`Failed to send email: ${error}`);
      }
      sentData = data;
      
      // Get threadId if this is a reply
      if (originalEmailId) {
        const originalEmail = await ctx.runQuery(api.emails.get, { id: originalEmailId });
        threadId = originalEmail?.threadId;
      }

    const sentAt = Date.now();

    // Store as a sent email using mutation
    const sentEmailId = await ctx.runMutation(api.emails.storeSentEmail, {
      from,
      to,
      cc,
      bcc,
      subject,
      preview: text || html.slice(0, 120),
      body: html,
      receivedAt: sentAt,
      messageId: sentData?.messageId || "sent-" + Date.now().toString(),
      threadId,
    });

    // If this was sent from a draft, delete the draft
    if (draftId) {
      await ctx.runMutation(api.emails.deleteDraft, { id: draftId });
    }

    return sentEmailId;
  },
});

export const contacts = query({
  args: {},
  handler: async (ctx) => {
    const emails = await ctx.db
      .query("emails")
      .withIndex("by_receivedAt")
      .order("desc")
      .collect();

    const map = new Map<string, ContactAccumulator>();

    for (const email of emails) {
      const seenAt = email.receivedAt ?? Date.now();
      registerContacts(map, email.from, seenAt);
      registerContacts(map, email.to, seenAt);
      registerContacts(map, email.cc, seenAt);
      registerContacts(map, email.bcc, seenAt);
    }

    return Array.from(map.values())
      .sort((a, b) => {
        if (b.lastSeen !== a.lastSeen) return b.lastSeen - a.lastSeen;
        if (b.count !== a.count) return b.count - a.count;
        return a.address.localeCompare(b.address);
      })
      .slice(0, 500);
  },
});

// Resend API integration for fetching email body content

export const applyFetchedBody = internalMutation({
  args: { 
    id: v.id("emails"), 
    body: v.string(), 
    preview: v.string() 
  },
  handler: async (ctx, { id, body, preview }) => {
    const existing = await ctx.db.get(id);
    if (!existing) return;
    // Idempotent: don't overwrite if body already exists
    if (existing.body && existing.body.length > 0) return;
    await ctx.db.patch(id, { body, preview });
  },
});

export const markBodyFetchFailed = internalMutation({
  args: { 
    id: v.id("emails"), 
    error: v.string(), 
    attempt: v.number() 
  },
  handler: async (ctx, { id, error, attempt }) => {
    const existing = await ctx.db.get(id);
    if (!existing) return;
    // Store error info (note: these fields aren't in schema yet, but won't error)
    console.error(`Failed to fetch body for email ${id} after ${attempt} attempts: ${error}`);
  },
});

export const fetchResendBody = internalAction({
  args: {
    docId: v.id("emails"),
    emailId: v.string(),
    attempt: v.optional(v.number()),
  },
  handler: async (ctx, { docId, emailId, attempt = 1 }) => {
    const apiKey = process.env.NEXT_RESEND_API_KEY;
    if (!apiKey) {
      console.error("NEXT_RESEND_API_KEY not set, cannot fetch email body");
      return;
    }

    // Check if email already has body
    const existing = await ctx.runQuery(api.emails.get, { id: docId });
    if (!existing || (existing.body && existing.body.length > 0)) {
      return;
    }

    // Fetch email content from Resend API
    try {
      const res = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
        headers: { 
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (!res.ok) {
        const retryable = [404, 429].includes(res.status) || res.status >= 500;
        
        if (retryable && attempt < 5) {
          // Exponential backoff: 10s, 30s, 60s, 5min
          const backoffSec = [10, 30, 60, 300][attempt - 1] ?? 600;
          console.log(`Resend fetch failed (${res.status}), retrying in ${backoffSec}s (attempt ${attempt})`);
          
          await ctx.scheduler.runAfter(
            backoffSec * 1000, 
            internal.emails.fetchResendBody, 
            {
              docId,
              emailId,
              attempt: attempt + 1,
            }
          );
        } else {
          await ctx.runMutation(internal.emails.markBodyFetchFailed, {
            id: docId,
            error: `Resend API returned ${res.status}`,
            attempt,
          });
        }
        return;
      }

      const data = await res.json();
      
      // Extract html and text from response
      const html = data?.html ?? data?.html_body ?? "";
      const text = data?.text ?? data?.text_body ?? "";
      const body = html || text || "";
      const preview = (text || html || "").slice(0, 120) || "(no content)";

      // Update the email record with fetched body
      await ctx.runMutation(internal.emails.applyFetchedBody, { 
        id: docId, 
        body, 
        preview 
      });

    } catch (error: any) {
      console.error(`Error fetching Resend body for ${emailId}:`, error);
      
      // Retry on network errors
      if (attempt < 5) {
        const backoffSec = [10, 30, 60, 300][attempt - 1] ?? 600;
        await ctx.scheduler.runAfter(
          backoffSec * 1000, 
          internal.emails.fetchResendBody, 
          {
            docId,
            emailId,
            attempt: attempt + 1,
          }
        );
      } else {
        await ctx.runMutation(internal.emails.markBodyFetchFailed, {
          id: docId,
          error: error.message || "Unknown error",
          attempt,
        });
      }
    }
  },
});
