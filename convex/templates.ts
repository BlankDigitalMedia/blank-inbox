import { query, mutation, action } from "./_generated/server"
import { v } from "convex/values"
import { api, internal } from "./_generated/api"

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

export const publish = action({
  args: { id: v.id("templates") },
  handler: async (ctx, { id }) => {
    // Get the template
    const template = await ctx.runQuery(api.templates.get, { id })
    if (!template) {
      throw new Error("Template not found")
    }

    // Render the email using the server-side renderer
    // Note: We need to import and call renderEmail here
    // For now, we'll create a mutation that stores the data
    // The actual HTML rendering will happen in the action
    const { renderEmail } = await import("../lib/email/render-email.js")
    const { html, text, subject, preheader } = await renderEmail(template.content)

    // Update the template with published data
    await ctx.runMutation(internal.templates.updatePublished, {
      id,
      publishedContent: template.content,
      publishedHtml: html,
      publishedText: text,
      publishedAt: Date.now(),
    })

    return { success: true, subject, preheader }
  },
})

export const updatePublished = mutation({
  args: {
    id: v.id("templates"),
    publishedContent: v.any(),
    publishedHtml: v.string(),
    publishedText: v.string(),
    publishedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const { id, ...rest } = args
    await ctx.db.patch(id, rest)
  },
})

export const exportHtml = action({
  args: { id: v.id("templates") },
  handler: async (ctx, { id }) => {
    const template = await ctx.runQuery(api.templates.get, { id })
    if (!template) {
      throw new Error("Template not found")
    }

    const { renderEmail } = await import("../lib/email/render-email.js")
    const { html, text, subject, preheader } = await renderEmail(template.content)

    return { html, text, subject, preheader }
  },
})
