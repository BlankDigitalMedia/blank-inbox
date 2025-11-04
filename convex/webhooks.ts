import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const checkRateLimit = internalMutation({
  args: {
    ip: v.string(),
    limit: v.number(),
  },
  handler: async (ctx, { ip, limit }) => {
    const now = Date.now();
    const minuteBucket = Math.floor(now / 60000);

    const existing = await ctx.db
      .query("webhook_rate_limits")
      .withIndex("by_ip_bucket", (q) => 
        q.eq("ip", ip).eq("minuteBucket", minuteBucket)
      )
      .first();

    if (existing) {
      if (existing.count >= limit) {
        return false;
      }
      await ctx.db.patch(existing._id, { count: existing.count + 1 });
    } else {
      await ctx.db.insert("webhook_rate_limits", {
        ip,
        minuteBucket,
        count: 1,
      });

      const oneHourAgo = Math.floor((now - 3600000) / 60000);
      const oldRecords = await ctx.db
        .query("webhook_rate_limits")
        .withIndex("by_ip_bucket", (q) => q.eq("ip", ip))
        .filter((q) => q.lt(q.field("minuteBucket"), oneHourAgo))
        .collect();

      for (const record of oldRecords) {
        await ctx.db.delete(record._id);
      }
    }

    return true;
  },
});

export const logSecurityEvent = internalMutation({
  args: {
    ip: v.string(),
    eventType: v.string(),
    details: v.optional(v.string()),
  },
  handler: async (ctx, { ip, eventType, details }) => {
    await ctx.db.insert("webhook_security_logs", {
      timestamp: Date.now(),
      ip,
      eventType,
      details,
    });

    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const oldLogs = await ctx.db
      .query("webhook_security_logs")
      .withIndex("by_timestamp")
      .filter((q) => q.lt(q.field("timestamp"), oneWeekAgo))
      .collect();

    for (const log of oldLogs) {
      await ctx.db.delete(log._id);
    }
  },
});
