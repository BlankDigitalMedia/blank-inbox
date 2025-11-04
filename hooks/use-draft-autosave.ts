"use client"

import { useRef, useEffect, useCallback, useState } from "react"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import type { Editor } from '@tiptap/react'

type AutosaveStatus = "idle" | "saving" | "saved" | "error"

interface UseDraftAutosaveOptions {
  editor: Editor | null
  from: string
  to?: string
  cc?: string
  bcc?: string
  subject: string
  threadId?: string
  currentDraftId?: string
  debounceMs?: number
  onDraftIdChange?: (draftId: string) => void
}

export function useDraftAutosave({
  editor,
  from,
  to,
  cc,
  bcc,
  subject,
  threadId,
  currentDraftId,
  debounceMs = 800,
  onDraftIdChange,
}: UseDraftAutosaveOptions) {
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>("idle")
  const saveDraftMutation = useMutation(api.emails.saveDraft)
  const inflightRef = useRef<Promise<string | undefined> | null>(null)
  const debounced = useRef<number | null>(null)

  const performSave = useCallback(async () => {
    if (inflightRef.current || !editor) {
      return
    }
    
    const body = editor.getHTML()
    
    setAutosaveStatus("saving")
    const params = {
      id: currentDraftId as Id<"emails"> | undefined,
      from,
      to: to || undefined,
      cc: cc || undefined,
      bcc: bcc || undefined,
      subject,
      body,
      threadId,
    }
    
    try {
      const p = saveDraftMutation(params)
      inflightRef.current = p
      const savedId = await p
      inflightRef.current = null
      
      if (!currentDraftId && savedId && onDraftIdChange) {
        onDraftIdChange(savedId)
      }
      
      setAutosaveStatus("saved")
      setTimeout(() => setAutosaveStatus("idle"), 1200)
    } catch (e) {
      inflightRef.current = null
      setAutosaveStatus("error")
      console.error("Autosave failed:", e)
    }
  }, [from, to, cc, bcc, subject, threadId, currentDraftId, saveDraftMutation, onDraftIdChange, editor])

  const flush = useCallback(async () => {
    if (debounced.current) {
      clearTimeout(debounced.current)
      debounced.current = null
    }
    await performSave()
  }, [performSave])

  const handleBlur = useCallback(() => {
    if (!editor) return
    const body = editor.getHTML()
    const hasContent = !!from || !!to || !!cc || !!bcc || !!subject || !!body
    if (!hasContent) return
    performSave()
  }, [from, to, cc, bcc, subject, performSave, editor])

  // Set up editor update listener for autosave debouncing
  useEffect(() => {
    if (!editor) return

    const handleUpdate = () => {
      if (debounced.current) {
        clearTimeout(debounced.current)
      }
      debounced.current = window.setTimeout(() => {
        performSave()
      }, debounceMs)
    }

    editor.on('update', handleUpdate)

    return () => {
      editor.off('update', handleUpdate)
      if (debounced.current) {
        clearTimeout(debounced.current)
        debounced.current = null
      }
    }
  }, [editor, performSave, debounceMs])

  return {
    autosaveStatus,
    flush,
    handleBlur,
  }
}
