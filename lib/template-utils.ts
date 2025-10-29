import type { Data } from "@measured/puck"

export const createTemplateBlockId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `block-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`

export const ensureTemplateContentIds = (data: Data | undefined): [Data, boolean] => {
  const baseRoot = data?.root ?? { props: {} }
  const baseContent = Array.isArray(data?.content) ? data!.content.filter(Boolean).map((i) => ({ ...i })) : []
  const baseZones = (data as any)?.zones && typeof (data as any).zones === "object" ? { ...(data as any).zones } : {}

  let changed = baseContent.length !== (data?.content?.length ?? 0)
  const seen = new Set<string>()

  const createId = (preferred?: string, fallbackIndex?: number) => {
    let id = preferred && preferred.trim() ? preferred : undefined
    if (!id) id = `block-${fallbackIndex ?? 0}-${createTemplateBlockId()}`
    if (seen.has(id)) {
      id = `${id}-${createTemplateBlockId()}`
    }
    seen.add(id)
    return id
  }

  const normalizeArray = (arr: any[]): any[] =>
    (arr ?? []).filter(Boolean).map((item, index) => {
      let mutated = false
      const props = typeof item.props === "object" && item.props !== null ? { ...item.props } : {}
      const existingTopId = typeof item.id === "string" ? item.id : undefined
      const existingPropsId = typeof props.id === "string" ? props.id : undefined
      const id = createId(existingPropsId || existingTopId, index)

      if (props.id !== id) {
        props.id = id
        mutated = true
      }

      // Normalize zones on the item if present
      let nextZones = item.zones
      if (nextZones && typeof nextZones === "object") {
        const zonesCopy: Record<string, any[]> = {}
        let zonesChanged = false
        for (const [zone, zoneArr] of Object.entries(nextZones)) {
          const prev = Array.isArray(zoneArr) ? zoneArr : []
          const norm = normalizeArray(prev)
          zonesCopy[zone] = norm
          if (norm !== prev) zonesChanged = true
        }
        if (zonesChanged) {
          nextZones = zonesCopy
          mutated = true
        }
      }

      // Build next item without root-level id/key
      const hadTopLevelId = Object.prototype.hasOwnProperty.call(item, "id")
      const hadTopLevelKey = Object.prototype.hasOwnProperty.call(item, "key")
      const nextItem: any = {
        ...item,
        props,
      }
      if (hadTopLevelId || hadTopLevelKey) mutated = true
      delete nextItem.id
      delete nextItem.key
      if (nextZones) nextItem.zones = nextZones

      if (mutated) changed = true
      return nextItem
    })

  const normalizedContent = normalizeArray(baseContent)

  const normalizedZones: Record<string, any[]> = {}
  let zonesChanged = false
  for (const [zone, arr] of Object.entries(baseZones)) {
    const prev = Array.isArray(arr) ? arr : []
    const norm = normalizeArray(prev)
    normalizedZones[zone] = norm
    if (norm !== prev) zonesChanged = true
  }

  const next: Data = {
    ...(data ?? {}),
    root: baseRoot,
    content: normalizedContent,
    ...(zonesChanged || (data as any)?.zones ? { zones: normalizedZones } : {}),
  }

  if (!changed && !zonesChanged) {
    return [next, false]
  }
  return [next, true]
}
