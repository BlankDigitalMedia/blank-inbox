import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  emails: defineTable({
    from: v.string(),
    to: v.optional(v.string()),
    subject: v.string(),
    preview: v.string(),
    body: v.string(),
    read: v.boolean(),
    starred: v.boolean(),
    archived: v.optional(v.boolean()),
    trashed: v.optional(v.boolean()),
    draft: v.optional(v.boolean()),
    receivedAt: v.number(),
    messageId: v.optional(v.string()),
    threadId: v.optional(v.string()),
    category: v.optional(v.string()),
  }).index("by_receivedAt", ["receivedAt"]),
});


