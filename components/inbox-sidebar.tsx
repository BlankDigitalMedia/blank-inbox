"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { ThemeToggle } from "@/components/theme-toggle"
import { Inbox, Send, FileText, Archive, Trash2, Star, Search, PenSquare, X } from "lucide-react"

interface InboxSidebarProps {
  onClose?: () => void
}

export function InboxSidebar({ onClose }: InboxSidebarProps) {
  return (
    <div className="w-64 border-r border-border bg-background h-full flex flex-col">
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Mail</h1>
        <div className="flex items-center gap-2">
        <ThemeToggle />
        {onClose && (
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
        </div>
      </div>

      {/* Compose button */}
      <div className="px-4 pb-4">
        <Button className="w-full justify-start gap-2" size="sm">
          <PenSquare className="h-4 w-4" />
          Compose
        </Button>
      </div>

      {/* Search */}
      <div className="px-4 pb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search mail..." className="pl-9 h-9" />
        </div>
      </div>

      <Separator />

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1">
        <Button variant="ghost" className="w-full justify-start gap-3 font-normal" size="sm">
          <Inbox className="h-4 w-4" />
          <span>Inbox</span>
          <Badge variant="secondary" className="ml-auto">
            12
          </Badge>
        </Button>
        <Button variant="ghost" className="w-full justify-start gap-3 font-normal" size="sm">
          <Star className="h-4 w-4" />
          <span>Starred</span>
        </Button>
        <Button variant="ghost" className="w-full justify-start gap-3 font-normal" size="sm">
          <Send className="h-4 w-4" />
          <span>Sent</span>
        </Button>
        <Button variant="ghost" className="w-full justify-start gap-3 font-normal" size="sm">
          <FileText className="h-4 w-4" />
          <span>Drafts</span>
        </Button>
        <Button variant="ghost" className="w-full justify-start gap-3 font-normal" size="sm">
          <Archive className="h-4 w-4" />
          <span>Archive</span>
        </Button>
        <Button variant="ghost" className="w-full justify-start gap-3 font-normal" size="sm">
          <Trash2 className="h-4 w-4" />
          <span>Trash</span>
        </Button>
      </nav>
    </div>
  )
}
