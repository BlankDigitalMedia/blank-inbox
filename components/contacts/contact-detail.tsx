"use client"

import { useState } from "react"
import Image from "next/image"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Edit2, Save, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useQuery } from "convex/react"

interface Contact {
  _id: Id<"contacts">
  primaryEmail: string
  name?: string
  company?: string
  title?: string
  avatarUrl?: string
  notes?: string
  tags?: string[]
  lastContactedAt?: number
  createdAt: number
  updatedAt: number
}

interface ContactDetailProps {
  contact: Contact | null
  onBack?: () => void
}

export function ContactDetail({ contact, onBack }: ContactDetailProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState("")
  const [company, setCompany] = useState("")
  const [title, setTitle] = useState("")
  const [notes, setNotes] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")

  const updateContact = useMutation(api.contacts.updateContact)

  // Get message count for this contact
  const emails = useQuery(api.emails.list)
  const sentEmails = useQuery(api.emails.listSent)
  const messageCount = contact
    ? [...(emails || []), ...(sentEmails || [])].filter(
        (email) =>
          email.from?.toLowerCase() === contact.primaryEmail.toLowerCase() ||
          email.to?.toLowerCase() === contact.primaryEmail.toLowerCase() ||
          email.cc?.toLowerCase().includes(contact.primaryEmail.toLowerCase()) ||
          email.bcc?.toLowerCase().includes(contact.primaryEmail.toLowerCase())
      ).length
    : 0

  const initializeForm = () => {
    if (contact) {
      setName(contact.name || "")
      setCompany(contact.company || "")
      setTitle(contact.title || "")
      setNotes(contact.notes || "")
      setTags(contact.tags || [])
    }
  }

  const startEditing = () => {
    initializeForm()
    setIsEditing(true)
  }

  const cancelEditing = () => {
    setIsEditing(false)
    initializeForm()
  }

  const handleSave = async () => {
    if (!contact) return

    try {
      await updateContact({
        id: contact._id,
        name: name.trim() || undefined,
        company: company.trim() || undefined,
        title: title.trim() || undefined,
        notes: notes.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
      })
      toast.success("Contact updated")
      setIsEditing(false)
    } catch (error) {
      console.error("Failed to update contact:", error)
      toast.error("Failed to update contact")
    }
  }

  const handleAddTag = () => {
    const trimmed = tagInput.trim()
    if (!trimmed || tags.includes(trimmed)) return
    setTags([...tags, trimmed])
    setTagInput("")
  }

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag))
  }

  const getInitials = (contact: Contact) => {
    if (contact.name) {
      const parts = contact.name.trim().split(/\s+/).filter(Boolean).slice(0, 2)
      const initials = parts.map((part) => part[0] ?? "").join("")
      if (initials) return initials.toUpperCase()
    }
    const firstChar = contact.primaryEmail[0]
    return firstChar ? firstChar.toUpperCase() : "?"
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  if (!contact) {
    return (
      <div className="hidden lg:flex flex-1 items-center justify-center text-muted-foreground">
        <p className="text-sm">Select a contact to view details</p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 min-w-0 flex-col bg-background overflow-hidden">
      {/* Mobile header */}
      <div className="lg:hidden sticky top-0 z-20 flex items-center justify-between gap-2 border-b bg-background/95 px-2 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack} aria-label="Back to list">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium truncate">{contact.name || contact.primaryEmail}</div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="flex items-start gap-4 mb-6">
            <Avatar className="h-16 w-16">
              {contact.avatarUrl ? (
                <Image src={contact.avatarUrl} alt={contact.name || contact.primaryEmail} width={64} height={64} />
              ) : (
                <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                  {getInitials(contact)}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h1 className="text-2xl font-semibold">
                  {contact.name || contact.primaryEmail}
                </h1>
                {!isEditing && (
                  <Button variant="ghost" size="icon" onClick={startEditing} aria-label="Edit contact">
                    <Edit2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {!contact.name && <p className="text-sm text-muted-foreground">{contact.primaryEmail}</p>}
            </div>
          </div>

          {/* Edit mode */}
          {isEditing ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contact name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Company name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Job title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes about this contact..."
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <div className="flex gap-2 flex-wrap mb-2">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 hover:text-destructive"
                        aria-label={`Remove tag ${tag}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    id="tags"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        handleAddTag()
                      }
                    }}
                    placeholder="Add tag (press Enter)"
                  />
                  <Button onClick={handleAddTag} variant="outline">
                    Add
                  </Button>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave}>
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
                <Button variant="outline" onClick={cancelEditing}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            /* View mode */
            <div className="space-y-6">
              {/* Contact info */}
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <p className="text-sm">{contact.primaryEmail}</p>
                </div>
                {contact.company && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Company</Label>
                    <p className="text-sm">{contact.company}</p>
                  </div>
                )}
                {contact.title && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Title</Label>
                    <p className="text-sm">{contact.title}</p>
                  </div>
                )}
                {contact.tags && contact.tags.length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Tags</Label>
                    <div className="flex gap-2 flex-wrap mt-1">
                      {contact.tags.map((tag) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Notes */}
              {contact.notes && (
                <div>
                  <Label className="text-xs text-muted-foreground">Notes</Label>
                  <p className="text-sm whitespace-pre-wrap mt-1">{contact.notes}</p>
                </div>
              )}

              {/* Activity */}
              <div className="space-y-3">
                <h2 className="text-lg font-semibold">Activity</h2>
                <div>
                  <Label className="text-xs text-muted-foreground">Messages</Label>
                  <p className="text-sm">{messageCount} email{messageCount !== 1 ? "s" : ""}</p>
                </div>
                {contact.lastContactedAt && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Last contacted</Label>
                    <p className="text-sm">{formatDate(contact.lastContactedAt)}</p>
                  </div>
                )}
                <div>
                  <Label className="text-xs text-muted-foreground">Added</Label>
                  <p className="text-sm">{formatDate(contact.createdAt)}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


