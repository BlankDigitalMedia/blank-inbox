"use client"

import { useSyncExternalStore } from "react"

const QUERY = "(min-width: 1024px)"

function subscribe(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {}
  }

  const mediaQuery = window.matchMedia(QUERY)

  const handler = () => onStoreChange()

  mediaQuery.addEventListener?.("change", handler)

  return () => mediaQuery.removeEventListener?.("change", handler)
}

function getSnapshot() {
  if (typeof window === "undefined") {
    return false
  }

  return window.matchMedia(QUERY).matches
}

export function useIsLargeScreen() {
  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}
