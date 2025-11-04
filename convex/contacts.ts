import { query, mutation, action, internalMutation } from "./_generated/server"
import { v } from "convex/values"
import { api, internal } from "./_generated/api"
import type { Id, Doc } from "./_generated/dataModel"
import { requireUserId } from "./lib/auth"
import {
  listContactsSchema,
  getContactByEmailSchema,
  contactIdSchema,
  upsertContactSchema,
  updateContactSchema,
  mergeContactsSchema,
  touchLastContactedSchema,
} from "@/lib/schemas"

// Helper to normalize email (lowercase, trim)
const normalizeEmail = (email: string): string => {
  return email.trim().toLowerCase()
}

// Helper to extract name from email string (e.g., "John Doe <john@example.com>" -> "John Doe")
const extractNameFromEmailString = (emailString: string): string | undefined => {
  const match = emailString.match(/^(.+?)\s*<(.+)>$/)
  if (match && match[1]) {
    return match[1].trim()
  }
  return undefined
}

// Helper to extract all email addresses from a comma-separated string
const extractEmailsFromString = (emailString: string): string[] => {
  return emailString
    .split(",")
    .map((addr) => {
      const match = addr.match(/<([^>]+)>/) || [null, addr.trim()]
      return normalizeEmail(match[1] || addr.trim())
    })
    .filter((email) => email.length > 0)
}

export const listContacts = query({
  args: {
    search: v.optional(v.string()),
    tag: v.optional(v.string()),
    cursor: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireUserId(ctx)
    const { search, tag, limit } = listContactsSchema.parse(args)
    
    let contacts = await ctx.db
      .query("contacts")
      .withIndex("by_updatedAt")
      .order("desc")
      .take(limit ?? 100)

    // Filter by search term (name or email)
    if (search) {
      const searchLower = search.toLowerCase()
      contacts = contacts.filter((contact) => {
        const nameMatch = contact.name?.toLowerCase().includes(searchLower)
        const emailMatch = contact.primaryEmail.toLowerCase().includes(searchLower)
        const otherEmailsMatch = contact.emails?.some((email) =>
          email.toLowerCase().includes(searchLower)
        )
        return nameMatch || emailMatch || otherEmailsMatch
      })
    }

    // Filter by tag
    if (tag) {
      contacts = contacts.filter((contact) => contact.tags?.includes(tag))
    }

    return contacts
  },
})

export const getContactByEmail = query({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    await requireUserId(ctx)
    const { email } = getContactByEmailSchema.parse(args)
    const normalized = normalizeEmail(email)

    const contact = await ctx.db
      .query("contacts")
      .withIndex("by_primaryEmail", (q) => q.eq("primaryEmail", normalized))
      .first()

    return contact
  },
})

export const getContact = query({
  args: {
    id: v.id("contacts"),
  },
  handler: async (ctx, args) => {
    await requireUserId(ctx)
    const { id } = contactIdSchema.parse(args)
    return await ctx.db.get(id)
  },
})

export const upsertContact = mutation({
  args: {
    primaryEmail: v.string(),
    name: v.optional(v.string()),
    company: v.optional(v.string()),
    title: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    notes: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    await requireUserId(ctx)
    const { primaryEmail, name, company, title, avatarUrl, notes, tags } =
      upsertContactSchema.parse(args)

    const normalized = normalizeEmail(primaryEmail)
    const now = Date.now()

    // Check if contact exists
    const existing = await ctx.db
      .query("contacts")
      .withIndex("by_primaryEmail", (q) => q.eq("primaryEmail", normalized))
      .first()

    if (existing) {
      // Update existing contact
      const updatedFields: {
        name?: string
        company?: string
        title?: string
        avatarUrl?: string
        notes?: string
        tags?: string[]
        updatedAt: number
      } = {
        updatedAt: now,
      }

      if (name !== undefined) updatedFields.name = name
      if (company !== undefined) updatedFields.company = company
      if (title !== undefined) updatedFields.title = title
      if (avatarUrl !== undefined) updatedFields.avatarUrl = avatarUrl
      if (notes !== undefined) updatedFields.notes = notes
      if (tags !== undefined) updatedFields.tags = tags

      await ctx.db.patch(existing._id, updatedFields)
      return existing._id
    } else {
      // Create new contact
      const contactId = await ctx.db.insert("contacts", {
        primaryEmail: normalized,
        name,
        emails: [normalized],
        company,
        title,
        avatarUrl,
        notes,
        tags,
        createdAt: now,
        updatedAt: now,
      })
      return contactId
    }
  },
})

export const updateContact = mutation({
  args: {
    id: v.id("contacts"),
    name: v.optional(v.string()),
    company: v.optional(v.string()),
    title: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    notes: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    await requireUserId(ctx)
    const { id, name, company, title, avatarUrl, notes, tags } =
      updateContactSchema.parse(args)

    const contact = await ctx.db.get(id)
    if (!contact) {
      throw new Error("Contact not found")
    }

    const updatedFields: {
      name?: string
      company?: string
      title?: string
      avatarUrl?: string
      notes?: string
      tags?: string[]
      updatedAt: number
    } = {
      updatedAt: Date.now(),
    }

    if (name !== undefined) updatedFields.name = name
    if (company !== undefined) updatedFields.company = company
    if (title !== undefined) updatedFields.title = title
    if (avatarUrl !== undefined) updatedFields.avatarUrl = avatarUrl
    if (notes !== undefined) updatedFields.notes = notes
    if (tags !== undefined) updatedFields.tags = tags

    await ctx.db.patch(id, updatedFields)
    return id
  },
})

export const mergeContacts = mutation({
  args: {
    sourceId: v.id("contacts"),
    targetId: v.id("contacts"),
  },
  handler: async (ctx, args) => {
    await requireUserId(ctx)
    const { sourceId, targetId } = mergeContactsSchema.parse(args)

    const source = await ctx.db.get(sourceId)
    const target = await ctx.db.get(targetId)

    if (!source || !target) {
      throw new Error("One or both contacts not found")
    }

    // Type assertion: we know these are contacts because we fetched by contact ID
    const sourceContact = source as Doc<"contacts">
    const targetContact = target as Doc<"contacts">

    // Merge fields: prefer non-empty values from source if target is empty
    const mergedName = targetContact.name || sourceContact.name
    const mergedCompany = targetContact.company || sourceContact.company
    const mergedTitle = targetContact.title || sourceContact.title
    const mergedAvatarUrl = targetContact.avatarUrl || sourceContact.avatarUrl
    const mergedNotes = targetContact.notes || sourceContact.notes

    // Merge tags (union)
    const mergedTags = Array.from(
      new Set([...(targetContact.tags || []), ...(sourceContact.tags || [])])
    )

    // Merge emails (union)
    const mergedEmails = Array.from(
      new Set([
        ...(targetContact.emails || []),
        ...(sourceContact.emails || []),
        sourceContact.primaryEmail,
      ])
    )

    // Update target with merged data
    await ctx.db.patch(targetId, {
      name: mergedName,
      company: mergedCompany,
      title: mergedTitle,
      avatarUrl: mergedAvatarUrl,
      notes: mergedNotes,
      tags: mergedTags.length > 0 ? mergedTags : undefined,
      emails: mergedEmails,
      updatedAt: Date.now(),
    })

    // Delete source
    await ctx.db.delete(sourceId)

    return targetId
  },
})

export const touchLastContacted = mutation({
  args: {
    email: v.string(),
    ts: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireUserId(ctx)
    const { email, ts } = touchLastContactedSchema.parse(args)

    const normalized = normalizeEmail(email)
    const timestamp = ts ?? Date.now()

    const contact = await ctx.db
      .query("contacts")
      .withIndex("by_primaryEmail", (q) => q.eq("primaryEmail", normalized))
      .first()

    if (contact) {
      await ctx.db.patch(contact._id, {
        lastContactedAt: timestamp,
        updatedAt: Date.now(),
      })
    }
  },
})

// Internal mutation for upserting contacts from email addresses
export const upsertContactFromEmail = internalMutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
  },
  handler: async (ctx, { email, name }) => {
    const normalized = normalizeEmail(email)
    const now = Date.now()

    // Check if contact exists
    const existing = await ctx.db
      .query("contacts")
      .withIndex("by_primaryEmail", (q) => q.eq("primaryEmail", normalized))
      .first()

    if (existing) {
      // Update name if provided and not already set
      const updates: {
        name?: string
        lastContactedAt: number
        updatedAt: number
      } = {
        lastContactedAt: now,
        updatedAt: now,
      }

      if (name && !existing.name) {
        updates.name = name
      }

      await ctx.db.patch(existing._id, updates)
      return existing._id
    } else {
      // Create new contact
      const contactId = await ctx.db.insert("contacts", {
        primaryEmail: normalized,
        name,
        emails: [normalized],
        lastContactedAt: now,
        createdAt: now,
        updatedAt: now,
      })
      return contactId
    }
  },
})

// Internal mutation for touching last contacted timestamp
export const touchLastContactedInternal = internalMutation({
  args: {
    email: v.string(),
    ts: v.number(),
  },
  handler: async (ctx, { email, ts }) => {
    const normalized = normalizeEmail(email)

    const contact = await ctx.db
      .query("contacts")
      .withIndex("by_primaryEmail", (q) => q.eq("primaryEmail", normalized))
      .first()

    if (contact) {
      await ctx.db.patch(contact._id, {
        lastContactedAt: ts,
        updatedAt: Date.now(),
      })
    }
  },
})

// Backfill action to seed contacts from existing emails
export const backfillFromEmails = action({
  args: {},
  handler: async (ctx) => {
    await requireUserId(ctx)

    // Get all emails (paginated)
    const emails = await ctx.runQuery(api.emails.list)
    const sentEmails = await ctx.runQuery(api.emails.listSent)

    const allEmails = [...(emails || []), ...(sentEmails || [])]
    const processed = new Set<string>()

    for (const email of allEmails) {
      // Process 'from' field
      if (email.from) {
        const fromNormalized = normalizeEmail(email.from)
        if (!processed.has(fromNormalized)) {
          const name = extractNameFromEmailString(email.from)
          await ctx.runMutation(internal.contacts.upsertContactFromEmail, {
            email: fromNormalized,
            name,
          })
          processed.add(fromNormalized)
        }
      }

      // Process 'to' field
      if (email.to) {
        const toEmails = extractEmailsFromString(email.to)
        for (const addr of toEmails) {
          if (!processed.has(addr)) {
            await ctx.runMutation(internal.contacts.upsertContactFromEmail, {
              email: addr,
            })
            processed.add(addr)
          }
        }
      }

      // Process 'cc' field
      if (email.cc) {
        const ccEmails = extractEmailsFromString(email.cc)
        for (const addr of ccEmails) {
          if (!processed.has(addr)) {
            await ctx.runMutation(internal.contacts.upsertContactFromEmail, {
              email: addr,
            })
            processed.add(addr)
          }
        }
      }
    }

    return { processed: processed.size }
  },
})

