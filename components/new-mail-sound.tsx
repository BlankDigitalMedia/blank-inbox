"use client"

import { useEffect, useRef } from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { usePathname } from "next/navigation"

function NewMailSoundInner() {
  const unreadCount = useQuery(api.emails.unreadCount)
  const prevCountRef = useRef<number | undefined>(undefined)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Initialize audio once
  useEffect(() => {
    const audio = new Audio("/sounds/you-got-mail.mp3")
    audio.preload = "auto"
    audioRef.current = audio
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ""
        audioRef.current = null
      }
    }
  }, [])

  // Play when unread count increases (skip first load)
  useEffect(() => {
    if (typeof unreadCount !== "number") return
    const prev = prevCountRef.current
    prevCountRef.current = unreadCount
    if (prev === undefined) return
    if (unreadCount > prev) {
      const a = audioRef.current
      if (a) {
        a.currentTime = 0
        a.play().catch(() => {})
      }
    }
  }, [unreadCount])

  return null
}

export function NewMailSound() {
  const pathname = usePathname()
  if (pathname === "/signin") return null
  return <NewMailSoundInner />
}

