"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useCompose } from "@/app/providers/compose-provider"

export default function ComposePage() {
  const router = useRouter()
  const { openNew } = useCompose()
  
  useEffect(() => {
    openNew()
    router.replace("/")
  }, [openNew, router])
  
  return null
}
