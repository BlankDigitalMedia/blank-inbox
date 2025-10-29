import { query, mutation } from "./_generated/server"
import { v } from "convex/values"

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("templates")
      .withIndex("by_updatedAt")
      .order("desc")
      .collect()
  },
})

export const get = query({
  args: { id: v.id("templates") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id)
  },
})

export const upsert = mutation({
  args: {
    id: v.optional(v.id("templates")),
    name: v.string(),
    description: v.optional(v.string()),
    content: v.any(),
  },
  handler: async (ctx, { id, name, description, content }) => {
    const timestamp = Date.now()

    if (id) {
      await ctx.db.patch(id, {
        name,
        description,
        content,
        updatedAt: timestamp,
      })
      return id
    }

    return await ctx.db.insert("templates", {
      name,
      description,
      content,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
  },
})

export const remove = mutation({
  args: { id: v.id("templates") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id)
  },
})
