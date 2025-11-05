"use client"

import { useState, useCallback, useEffect } from "react"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ArrowLeft, Edit2, Save, X, Trash2, Sparkles, Loader2, ExternalLink } from "lucide-react"
import { cn, extractEmailAddress } from "@/lib/utils"
import { toast } from "sonner"
import { ContactEventsTimeline } from "@/components/contacts/contact-events-timeline"

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
  emails?: string[]
  enrichment?: {
    contactId: Id<"contacts">
    provider: string
    updatedAt: number
    lastRunStatus: 'pending' | 'processing' | 'completed' | 'error' | 'skipped'
    lastRunError?: string
    fields?: Record<string, {
      field: string
      value: string | number | boolean | string[]
      confidence: number
      source?: string
      sourceContext?: Array<{ url: string; snippet: string }>
    }>
  }
  createdAt: number
  updatedAt: number
}

interface ContactDetailProps {
  contact: Contact | null
  onBack?: () => void
  onDeleted?: () => void
}

export function ContactDetail({ contact, onBack, onDeleted }: ContactDetailProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(contact?.name ?? "")
  const [company, setCompany] = useState(contact?.company ?? "")
  const [title, setTitle] = useState(contact?.title ?? "")
  const [notes, setNotes] = useState(contact?.notes ?? "")
  const [tags, setTags] = useState<string[]>(contact?.tags ?? [])
  const [tagInput, setTagInput] = useState("")
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isEnriching, setIsEnriching] = useState(false)

  const updateContact = useMutation(api.contacts.updateContact)
  const deleteContact = useMutation(api.contacts.deleteContact)
  const updateEnrichment = useMutation(api.contacts.updateEnrichment)

  const initializeForm = useCallback(() => {
    if (contact) {
      setName(contact.name || "")
      setCompany(contact.company || "")
      setTitle(contact.title || "")
      setNotes(contact.notes || "")
      setTags(contact.tags || [])
    } else {
      setName("")
      setCompany("")
      setTitle("")
      setNotes("")
      setTags([])
    }
    setTagInput("")
  }, [contact])

  useEffect(() => {
    initializeForm()
    setIsEditing(false)
  }, [initializeForm])

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

  const handleDelete = async () => {
    if (!contact) return

    try {
      await deleteContact({ id: contact._id })
      toast.success("Contact deleted")
      setShowDeleteDialog(false)
      if (onDeleted) {
        onDeleted()
      }
    } catch (error) {
      console.error("Failed to delete contact:", error)
      toast.error("Failed to delete contact")
    }
  }

  const handleEnrich = async () => {
    if (!contact || isEnriching) return

    setIsEnriching(true)
    try {
      // Call enrichment API
      const response = await fetch('/api/enrich', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: contact.primaryEmail,
        }),
      })

      const data = await response.json()

      if (!data.success) {
        if (data.status === 'skipped') {
          toast.info(data.error || 'Email skipped from enrichment')
        } else {
          toast.error(data.error || 'Failed to enrich contact')
        }
        setIsEnriching(false)
        return
      }

      // Save enrichment results to Convex
      await updateEnrichment({
        contactId: contact._id,
        enrichments: data.data.enrichments,
        status: 'completed',
      })

      toast.success("Contact enriched successfully")
      // Convex reactivity will automatically update the contact data
      // No need to reload - the query will update automatically
    } catch (error) {
      console.error("Failed to enrich contact:", error)
      toast.error("Failed to enrich contact")
    } finally {
      setIsEnriching(false)
    }
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

  const displayEmail = contact ? extractEmailAddress(contact.primaryEmail) : ""

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
                  {contact.name || displayEmail}
                </h1>
                {!isEditing && (
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={handleEnrich}
                      disabled={isEnriching}
                      aria-label="Enrich contact"
                    >
                      {isEnriching ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Enriching...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Enrich
                        </>
                      )}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={startEditing} aria-label="Edit contact">
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setShowDeleteDialog(true)} 
                      aria-label="Delete contact"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
              {!contact.name && <p className="text-sm text-muted-foreground">{displayEmail}</p>}
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
                  <p className="text-sm">{displayEmail}</p>
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

              {/* Enrichment */}
              {contact.enrichment && contact.enrichment.fields && Object.keys(contact.enrichment.fields).length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Enrichment</h2>
                    {(!contact.company || !contact.title) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          try {
                            await updateContact({
                              id: contact._id,
                              company: contact.enrichment?.fields?.companyName?.value as string | undefined || contact.company,
                              title: contact.enrichment?.fields?.titleNormalized?.value as string | undefined || contact.title,
                            })
                            toast.success("Applied enrichment suggestions")
                          } catch (error) {
                            console.error("Failed to apply enrichment:", error)
                            toast.error("Failed to apply enrichment")
                          }
                        }}
                      >
                        Apply Suggestions
                      </Button>
                    )}
                  </div>

                  {/* Group fields by category */}
                  {(() => {
                    const companyFields = [
                      'companyName', 'website', 'domain', 'companyType',
                      'industry', 'headquarters', 'yearFounded', 'description', 'employeeCount',
                      'fundingStage', 'totalRaised', 'lastRoundAmount', 'lastRoundDate', 'investors', 'valuation',
                      'languages', 'frameworks', 'infrastructure', 'tools', 'techStack',
                    ]
                    const personFields = [
                      'titleNormalized', 'seniority', 'department', 'linkedinUrl', 'location',
                    ]

                    const enrichmentEntries = Object.entries(contact.enrichment.fields)
                    const companyEnrichments = enrichmentEntries.filter(([name]) => companyFields.includes(name))
                    const personEnrichments = enrichmentEntries.filter(([name]) => personFields.includes(name))
                    const otherEnrichments = enrichmentEntries.filter(
                      ([name]) => !companyFields.includes(name) && !personFields.includes(name)
                    )

                    return (
                      <div className="space-y-4">
                        {/* Company Section */}
                        {companyEnrichments.length > 0 && (
                          <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-muted-foreground">Company</h3>
                            <div className="space-y-2">
                              {companyEnrichments.map(([fieldName, enrichment]) => (
                                <div key={fieldName} className="border rounded-lg p-3">
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                      <Label className="text-xs text-muted-foreground font-medium">
                                        {fieldName.charAt(0).toUpperCase() + fieldName.slice(1).replace(/([A-Z])/g, ' $1')}
                                      </Label>
                                      <p className="text-sm mt-1">
                                        {Array.isArray(enrichment.value) 
                                          ? enrichment.value.join(', ')
                                          : String(enrichment.value)}
                                      </p>
                                    </div>
                                    <Badge variant="secondary" className="text-xs shrink-0 ml-2">
                                      {Math.round(enrichment.confidence * 100)}%
                                    </Badge>
                                  </div>
                                  {enrichment.source && (
                                    <a
                                      href={enrichment.source}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mt-2"
                                    >
                                      <ExternalLink className="h-3 w-3" />
                                      Source
                                    </a>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Person Section */}
                        {personEnrichments.length > 0 && (
                          <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-muted-foreground">Person</h3>
                            <div className="space-y-2">
                              {personEnrichments.map(([fieldName, enrichment]) => (
                                <div key={fieldName} className="border rounded-lg p-3">
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                      <Label className="text-xs text-muted-foreground font-medium">
                                        {fieldName.charAt(0).toUpperCase() + fieldName.slice(1).replace(/([A-Z])/g, ' $1')}
                                      </Label>
                                      <p className="text-sm mt-1">
                                        {Array.isArray(enrichment.value) 
                                          ? enrichment.value.join(', ')
                                          : String(enrichment.value)}
                                      </p>
                                    </div>
                                    <Badge variant="secondary" className="text-xs shrink-0 ml-2">
                                      {Math.round(enrichment.confidence * 100)}%
                                    </Badge>
                                  </div>
                                  {enrichment.source && (
                                    <a
                                      href={enrichment.source}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mt-2"
                                    >
                                      <ExternalLink className="h-3 w-3" />
                                      Source
                                    </a>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Other Fields */}
                        {otherEnrichments.length > 0 && (
                          <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-muted-foreground">Other</h3>
                            <div className="space-y-2">
                              {otherEnrichments.map(([fieldName, enrichment]) => (
                                <div key={fieldName} className="border rounded-lg p-3">
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                      <Label className="text-xs text-muted-foreground font-medium">
                                        {fieldName.charAt(0).toUpperCase() + fieldName.slice(1).replace(/([A-Z])/g, ' $1')}
                                      </Label>
                                      <p className="text-sm mt-1">
                                        {Array.isArray(enrichment.value) 
                                          ? enrichment.value.join(', ')
                                          : String(enrichment.value)}
                                      </p>
                                    </div>
                                    <Badge variant="secondary" className="text-xs shrink-0 ml-2">
                                      {Math.round(enrichment.confidence * 100)}%
                                    </Badge>
                                  </div>
                                  {enrichment.source && (
                                    <a
                                      href={enrichment.source}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mt-2"
                                    >
                                      <ExternalLink className="h-3 w-3" />
                                      Source
                                    </a>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <p className="text-xs text-muted-foreground">
                          Last updated: {formatDate(contact.enrichment.updatedAt)}
                        </p>
                      </div>
                    )
                  })()}
                </div>
              )}

              {/* Email History */}
              <div className="space-y-3">
                <h2 className="text-lg font-semibold">Email History</h2>
                <ContactEventsTimeline
                  key={contact._id}
                  contactId={contact._id}
                  contactEmail={displayEmail}
                  contactEmails={contact.emails || []}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Contact</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {contact.name || contact.primaryEmail}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}


