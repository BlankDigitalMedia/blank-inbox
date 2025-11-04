"use client"

import { useState } from "react"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { X } from "lucide-react"
import { toast } from "sonner"

interface NewContactDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: (contactId: Id<"contacts">) => void
}

export function NewContactDialog({
  open,
  onOpenChange,
  onCreated,
}: NewContactDialogProps) {
  const [primaryEmail, setPrimaryEmail] = useState("")
  const [name, setName] = useState("")
  const [company, setCompany] = useState("")
  const [title, setTitle] = useState("")
  const [notes, setNotes] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")

  const upsertContact = useMutation(api.contacts.upsertContact)

  const resetForm = () => {
    setPrimaryEmail("")
    setName("")
    setCompany("")
    setTitle("")
    setNotes("")
    setTags([])
    setTagInput("")
  }

  const handleClose = () => {
    resetForm()
    onOpenChange(false)
  }

  const handleSave = async () => {
    const trimmedEmail = primaryEmail.trim()
    if (!trimmedEmail) {
      toast.error("Email is required")
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmedEmail)) {
      toast.error("Please enter a valid email address")
      return
    }

    try {
      const contactId = await upsertContact({
        primaryEmail: trimmedEmail,
        name: name.trim() || undefined,
        company: company.trim() || undefined,
        title: title.trim() || undefined,
        notes: notes.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
      })

      toast.success("Contact created")
      resetForm()
      onOpenChange(false)
      if (onCreated) {
        onCreated(contactId)
      }
    } catch (error) {
      console.error("Failed to create contact:", error)
      toast.error("Failed to create contact")
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Contact</DialogTitle>
          <DialogDescription>
            Add a new contact to your address book
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email">
              Email <span className="text-destructive">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              value={primaryEmail}
              onChange={(e) => setPrimaryEmail(e.target.value)}
              placeholder="email@example.com"
              required
              autoFocus
            />
          </div>
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
              <Button onClick={handleAddTag} variant="outline" type="button">
                Add
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Create Contact
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

