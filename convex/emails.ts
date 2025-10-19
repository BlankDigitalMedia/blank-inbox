import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const emails = await ctx.db
      .query("emails")
      .withIndex("by_receivedAt")
      .filter((q) => q.neq(q.field("archived"), true))
      .order("desc")
      .collect();
    return emails;
  },
});

export const listArchived = query({
  args: {},
  handler: async (ctx) => {
    const emails = await ctx.db
      .query("emails")
      .withIndex("by_receivedAt")
      .filter((q) => q.eq(q.field("archived"), true))
      .order("desc")
      .collect();
    return emails;
  },
});

export const listStarred = query({
  args: {},
  handler: async (ctx) => {
    const emails = await ctx.db
      .query("emails")
      .withIndex("by_receivedAt")
      .filter((q) => q.eq(q.field("starred"), true))
      .order("desc")
      .collect();
    return emails;
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

export const upsertFromInbound = internalMutation({
  args: { payload: v.any() },
  handler: async (ctx, { payload }) => {
    // Parse inbound.new webhook structure - email data is nested under payload.email
    const email = payload?.email || payload;

    // Extract email data from inbound.new webhook structure
    const from = email?.from?.text || email?.from || "Unknown";
    const to = email?.to?.text || email?.to || email?.recipient || undefined;
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
      subject,
      preview,
      body,
      read: false,
      starred: false,
      archived: false,
      receivedAt,
      messageId,
      threadId,
      category: "inbox",
    });
  },
});


