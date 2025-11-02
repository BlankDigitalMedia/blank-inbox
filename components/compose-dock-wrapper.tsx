"use client"

import { usePathname } from "next/navigation"
import { ComposeDock } from "@/components/composer/compose-dock"

export function ComposeDockWrapper() {
  const pathname = usePathname()
  
  if (pathname === "/signin") {
    return null
  }
  
  return <ComposeDock />
}
