"use client"

import { useCallback, useEffect, useMemo, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useCompose } from "@/app/providers/compose-provider"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import type { Email, EmailDoc } from "@/lib/types"

export default function ComposePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const draftId = searchParams.get("draft")
  const { openNew, openDraft } = useCompose()
  const hasOpenedRef = useRef(false)

  const draftDoc = useQuery(
    draftId ? api.emails.getById : undefined,
    draftId ? { id: draftId as Id<"emails"> } : undefined
  )

  const draftEmail = useMemo<Email | null>(() => {
    if (!draftDoc) return null

    const typedDraft = draftDoc as EmailDoc
    return {
      id: typedDraft._id,
      from: typedDraft.from,
      to: typedDraft.to,
      cc: typedDraft.cc,
      bcc: typedDraft.bcc,
      subject: typedDraft.subject,
      preview: typedDraft.preview,
      time: new Date(typedDraft.receivedAt).toLocaleString(),
      read: typedDraft.read,
      starred: typedDraft.starred,
      archived: typedDraft.archived,
      trashed: typedDraft.trashed,
      category: typedDraft.category ?? "inbox",
      body: typedDraft.body,
      threadId: typedDraft.threadId,
      threadCount: 1,
      threadEmails: [typedDraft],
    }
  }, [draftDoc])

  const redirectToPrevious = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back()
    } else {
      router.replace(draftId ? "/drafts" : "/")
    }
  }, [draftId, router])
  
  useEffect(() => {
    if (hasOpenedRef.current) {
      return
    }

    if (draftId) {
      if (draftDoc === undefined) {
        return
      }

      hasOpenedRef.current = true

      if (draftEmail) {
        openDraft(draftEmail)
      } else {
        openNew()
      }

      redirectToPrevious()
      return
    }

    hasOpenedRef.current = true
    openNew()
    router.replace("/")
  }, [draftId, draftDoc, draftEmail, openDraft, openNew, redirectToPrevious, router])
  
  return null
}
