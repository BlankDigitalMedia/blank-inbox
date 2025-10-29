"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { MailSidebar } from "@/components/mail-sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TemplateBuilder, defaultTemplateData } from "@/components/templates/template-builder"
import { Plus, Loader2, Undo2, Redo2, Upload } from "lucide-react"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import type { Data } from "@measured/puck"
import { cn } from "@/lib/utils"
import { ensureTemplateContentIds } from "@/lib/template-utils"
import { toast } from "sonner"

type TemplateRecord = {
  _id: Id<"templates">
  name: string
  description?: string
  content: Data
  createdAt: number
  updatedAt: number
}

type SavePayload = {
  id: Id<"templates">
  name: string
  description?: string
  content: Data
}

const cloneDefaultData = (): Data => JSON.parse(JSON.stringify(defaultTemplateData)) as Data

export default function TemplatesPage() {
  const templates = useQuery(api.templates.list) as TemplateRecord[] | undefined
  const upsertTemplate = useMutation(api.templates.upsert)

  const [selectedTemplateId, setSelectedTemplateId] = useState<Id<"templates"> | null>(null)
  const [nameDraft, setNameDraft] = useState("")
  const [descriptionDraft, setDescriptionDraft] = useState("")
  const [editorState, setEditorState] = useState<Data>(() => ensureTemplateContentIds(cloneDefaultData())[0])
  const [isCreating, setIsCreating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null)

  const saveTimer = useRef<NodeJS.Timeout | null>(null)
  const pendingSave = useRef<SavePayload | null>(null)
  const latestTemplateId = useRef<Id<"templates"> | null>(null)
  const isMounted = useRef(true)
  const historyRef = useRef<{ past: Data[]; future: Data[] }>({ past: [], future: [] })

  const selectedTemplate = useMemo(() => {
    if (!templates || templates.length === 0) return null
    if (selectedTemplateId) return templates.find((tpl) => tpl._id === selectedTemplateId) ?? null
    return templates[0] ?? null
  }, [selectedTemplateId, templates])

  useEffect(() => {
    if (!templates || templates.length === 0) {
      setSelectedTemplateId(null)
      return
    }

    if (!selectedTemplateId) {
      setSelectedTemplateId(templates[0]._id)
    }
  }, [selectedTemplateId, templates])

  const runSave = useCallback(
    async (payload: SavePayload) => {
      const request = upsertTemplate(payload)
      if (!isMounted.current) {
        await request
        return
      }

      setIsSaving(true)
      try {
        await request
        const now = Date.now()
        setLastSavedAt(now)
        // Show toast only if no pending save
        if (!pendingSave.current) {
          toast.success("Saved", { duration: 2000 })
        }
      } finally {
        setIsSaving(false)
      }
    },
    [upsertTemplate]
  )

  const scheduleSave = useCallback(
    (payload: SavePayload) => {
      pendingSave.current = payload
      if (saveTimer.current) {
        clearTimeout(saveTimer.current)
      }
      saveTimer.current = setTimeout(async () => {
        const nextPayload = pendingSave.current
        pendingSave.current = null
        if (!nextPayload) return
        await runSave(nextPayload)
      }, 800)
    },
    [runSave]
  )

  const flushSave = useCallback(async () => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current)
      saveTimer.current = null
    }
    if (!pendingSave.current) return
    const nextPayload = pendingSave.current
    pendingSave.current = null
    await runSave(nextPayload)
  }, [runSave])

  const pushHistory = useCallback((prev: Data) => {
    const arr = historyRef.current.past
    // Deep clone to avoid reference/shared-mutation issues
    const snapshot = structuredClone(prev)
    // Optional de-dupe: skip if identical to last snapshot
    const last = arr[arr.length - 1]
    if (last && JSON.stringify(last) === JSON.stringify(snapshot)) {
      historyRef.current.future = [] // clear redo on a new user edit
      return
    }
    arr.push(snapshot)
    if (arr.length > 50) arr.shift()
    historyRef.current.future = []
  }, [])

  useEffect(() => {
    if (!selectedTemplate) return

    const sourceData = selectedTemplate.content ?? cloneDefaultData()
    const [normalizedData, changed] = ensureTemplateContentIds(sourceData)

    setNameDraft(selectedTemplate.name)
    setDescriptionDraft(selectedTemplate.description ?? "")
    setEditorState(normalizedData)
    latestTemplateId.current = selectedTemplate._id
    historyRef.current = { past: [], future: [] }

    if (changed) {
      scheduleSave({
        id: selectedTemplate._id,
        name: selectedTemplate.name,
        description: selectedTemplate.description,
        content: normalizedData,
      })
    }
  }, [scheduleSave, selectedTemplate])

  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current)
      }
      if (pendingSave.current) {
        void runSave(pendingSave.current)
        pendingSave.current = null
      }
      isMounted.current = false
    }
  }, [runSave])

  const handleUndo = useCallback(() => {
    const { past, future } = historyRef.current
    if (!past.length) return
    const prev = past.pop()!
    // Save current into future as a clone
    future.push(structuredClone(editorState))
    setEditorState(prev)
    const templateId = latestTemplateId.current
    if (templateId) {
      scheduleSave({
        id: templateId,
        name: nameDraft.trim() ? nameDraft : "Untitled template",
        description: descriptionDraft.trim() ? descriptionDraft : undefined,
        content: prev,
      })
    }
  }, [descriptionDraft, editorState, nameDraft, scheduleSave])

  const handleRedo = useCallback(() => {
    const { past, future } = historyRef.current
    if (!future.length) return
    const next = future.pop()!
    // Save current into past as a clone
    past.push(structuredClone(editorState))
    setEditorState(next)
    const templateId = latestTemplateId.current
    if (templateId) {
      scheduleSave({
        id: templateId,
        name: nameDraft.trim() ? nameDraft : "Untitled template",
        description: descriptionDraft.trim() ? descriptionDraft : undefined,
        content: next,
      })
    }
  }, [descriptionDraft, editorState, nameDraft, scheduleSave])

  const handlePublishClick = useCallback(async () => {
    await flushSave()
    toast.success("Published", { duration: 2000 })
  }, [flushSave])

  // Keyboard shortcuts: Cmd/Ctrl+S to save, Z to undo, Shift+Z to redo
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      if ((e.metaKey || e.ctrlKey) && key === "s") {
        e.preventDefault()
        void flushSave()
        return
      }
      if ((e.metaKey || e.ctrlKey) && key === "z") {
        e.preventDefault()
        if (e.shiftKey) handleRedo()
        else handleUndo()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [flushSave, handleRedo, handleUndo])

  const handleSelectTemplate = useCallback(
    async (id: Id<"templates">) => {
      if (id === selectedTemplateId) return
      await flushSave()
      setSelectedTemplateId(id)
    },
    [flushSave, selectedTemplateId]
  )

  const handleCreateTemplate = useCallback(async () => {
    setIsCreating(true)
    try {
      const [initialData] = ensureTemplateContentIds(cloneDefaultData())
      const name = "New template"
      const id = (await upsertTemplate({
        name,
        description: "",
        content: initialData,
      })) as Id<"templates">

      pendingSave.current = null
      if (saveTimer.current) {
        clearTimeout(saveTimer.current)
        saveTimer.current = null
      }

      setNameDraft(name)
      setDescriptionDraft("")
      setEditorState(initialData)
      setSelectedTemplateId(id)
      latestTemplateId.current = id
      setLastSavedAt(Date.now())
    } finally {
      setIsCreating(false)
    }
  }, [upsertTemplate])

  const handleNameChange = useCallback(
    (value: string) => {
      setNameDraft(value)
      const templateId = latestTemplateId.current
      if (!templateId) return
      scheduleSave({
        id: templateId,
        name: value.trim() ? value : "Untitled template",
        description: descriptionDraft.trim() ? descriptionDraft : undefined,
        content: editorState,
      })
    },
    [descriptionDraft, editorState, scheduleSave]
  )

  const handleDescriptionChange = useCallback(
    (value: string) => {
      setDescriptionDraft(value)
      const templateId = latestTemplateId.current
      if (!templateId) return
      scheduleSave({
        id: templateId,
        name: nameDraft.trim() ? nameDraft : "Untitled template",
        description: value.trim() ? value : undefined,
        content: editorState,
      })
    },
    [editorState, nameDraft, scheduleSave]
  )

  const handleEditorChange = useCallback(
    (data: Data) => {
      const [normalizedData] = ensureTemplateContentIds(data)
      pushHistory(editorState)
      setEditorState(normalizedData)
      const templateId = latestTemplateId.current
      if (!templateId) return
      scheduleSave({
        id: templateId,
        name: nameDraft.trim() ? nameDraft : "Untitled template",
        description: descriptionDraft.trim() ? descriptionDraft : undefined,
        content: normalizedData,
      })
    },
    [descriptionDraft, editorState, nameDraft, pushHistory, scheduleSave]
  )

  const handleSelectChange = useCallback(
    (value: string) => {
      void handleSelectTemplate(value as Id<"templates">)
    },
    [handleSelectTemplate]
  )

  const hasPendingSave = pendingSave.current !== null

  return (
    <SidebarProvider>
      <MailSidebar activeView="templates" />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-3 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <h1 className="text-lg font-semibold">Templates</h1>
          {templates && templates.length > 0 && selectedTemplate ? (
            <>
              <Select value={selectedTemplate._id} onValueChange={handleSelectChange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template._id} value={template._id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                className="w-[220px]"
                value={nameDraft}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Template name"
              />
              <Input
                className="w-[280px]"
                value={descriptionDraft}
                onChange={(e) => handleDescriptionChange(e.target.value)}
                placeholder="Description"
              />
            </>
          ) : null}
          <Button
            size="sm"
            variant="outline"
            onClick={handleCreateTemplate}
            disabled={isCreating}
          >
            {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            New template
          </Button>
          <div className="ml-auto flex items-center gap-2">
            {selectedTemplate ? (
              <>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleUndo}
                  disabled={!historyRef.current.past.length}
                  title="Undo (Cmd/Ctrl+Z)"
                >
                  <Undo2 className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleRedo}
                  disabled={!historyRef.current.future.length}
                  title="Redo (Shift+Cmd/Ctrl+Z)"
                >
                  <Redo2 className="h-4 w-4" />
                </Button>
                <Separator orientation="vertical" className="mx-1 h-5" />
                <Button size="sm" onClick={handlePublishClick} variant="default">
                  <Upload className="mr-2 h-4 w-4" />
                  Publish
                </Button>
                <Separator orientation="vertical" className="mx-1 h-5" />
              </>
            ) : null}
            <div className="text-sm text-muted-foreground">
              {isSaving || hasPendingSave ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </span>
              ) : lastSavedAt ? (
                <span>Saved {new Date(lastSavedAt).toLocaleTimeString()}</span>
              ) : null}
            </div>
          </div>
        </header>
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div className="flex min-w-0 flex-1 flex-col">
            {selectedTemplate ? null : (
              <div className="flex flex-1 items-center justify-center p-10">
                <div className="max-w-sm text-center">
                  <p className="text-sm text-muted-foreground">Create a template to start designing your marketing emails.</p>
                  <Button className="mt-4" onClick={handleCreateTemplate} disabled={isCreating}>
                    {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                    New template
                  </Button>
                </div>
              </div>
            )}
            <div className="flex-1 min-h-0 overflow-hidden">
              {selectedTemplate ? (
                <TemplateBuilder
                  value={editorState}
                  onChange={handleEditorChange}
                />
              ) : null}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
