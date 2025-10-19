import { query, mutation, action, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { Inbound } from "@inboundemail/sdk";

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
    // Parse inbound.new webhook structure - email data is nested under payload.email
    const email = payload?.email || payload;

    // Extract email data from inbound.new webhook structure
    const from = email?.from?.text || email?.from || "Unknown";
    const to = email?.to?.text || email?.to || email?.recipient || undefined;

    // Extract CC/BCC - Note: inbound.new may not include CC/BCC in webhook payloads for privacy reasons
    let cc = email?.cc?.text || email?.cc;
    let bcc = email?.bcc?.text || email?.bcc;

    // If CC/BCC are arrays of objects (like some email service formats), extract email addresses
    if (Array.isArray(email?.cc)) {
      cc = email.cc.map((item: any) => item?.email || item?.address || item).filter(Boolean).join(', ');
    }
    if (Array.isArray(email?.bcc)) {
      bcc = email.bcc.map((item: any) => item?.email || item?.address || item).filter(Boolean).join(', ');
    }

    // Handle parsedData if it contains CC/BCC info
    if (email?.parsedData?.cc && !cc) {
      cc = Array.isArray(email.parsedData.cc)
        ? email.parsedData.cc.join(', ')
        : email.parsedData.cc;
    }
    if (email?.parsedData?.bcc && !bcc) {
      bcc = Array.isArray(email.parsedData.bcc)
        ? email.parsedData.bcc.join(', ')
        : email.parsedData.bcc;
    }
    const subject = email?.subject || "(no subject)";
    const body = email?.cleanedContent?.html || email?.cleanedContent?.text || email?.html || email?.text || "";
    const preview = email?.cleanedContent?.text?.slice(0, 120) || body.slice(0, 120) || subject;
    const messageId: string | undefined = email?.messageId || email?.id;
    const threadId: string | undefined = email?.threadId;
    const receivedAt = email?.receivedAt ? Number(new Date(email.receivedAt)) :
                      email?.date ? Number(new Date(email.date)) : Date.now();

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
