"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ThemeToggle } from "@/components/theme-toggle"
import { useCompose } from "@/app/providers/compose-provider"
import { useAuthActions } from "@convex-dev/auth/react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuBadge,
  SidebarFooter,
} from "@/components/ui/sidebar"
import { Inbox, Send, FileText, Archive, Trash2, Star, Search, PenSquare, LogOut } from "lucide-react"

interface MailSidebarProps {
  activeView?: "inbox" | "starred" | "sent" | "archive" | "trash" | "drafts"
  unreadCount?: number
}

export function MailSidebar({ activeView, unreadCount = 0 }: MailSidebarProps) {
  const { openNew } = useCompose()
  const { signOut } = useAuthActions()
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut()
    router.push("/signin")
  }
  
  return (
    <Sidebar variant="inset" className="h-dvh">
      <SidebarHeader>
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Mail</h1>
          <ThemeToggle />
        </div>
        <Button onClick={() => openNew()} className="w-full justify-start gap-2" size="sm">
          <PenSquare className="h-4 w-4" />
          Compose
        </Button>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <div className="px-2 pb-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <SidebarInput placeholder="Search mail..." className="pl-9" />
              </div>
            </div>
            <Separator />
            <SidebarMenu>
              <SidebarMenuItem>
                {activeView === "inbox" ? (
                  <SidebarMenuButton>
                    <Inbox className="h-4 w-4" />
                    <span>Inbox</span>
                    {unreadCount > 0 && <SidebarMenuBadge>{unreadCount}</SidebarMenuBadge>}
                  </SidebarMenuButton>
                ) : (
                  <SidebarMenuButton asChild>
                    <Link href="/">
                      <Inbox className="h-4 w-4" />
                      <span>Inbox</span>
                      {unreadCount > 0 && <SidebarMenuBadge>{unreadCount}</SidebarMenuBadge>}
                    </Link>
                  </SidebarMenuButton>
                )}
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={activeView === "starred"}>
                  <Link href="/starred">
                    <Star className="h-4 w-4" />
                    <span>Starred</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={activeView === "sent"}>
                  <Link href="/sent">
                    <Send className="h-4 w-4" />
                    <span>Sent</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={activeView === "drafts"}>
                  <Link href="/drafts">
                    <FileText className="h-4 w-4" />
                    <span>Drafts</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={activeView === "archive"}>
                  <Link href="/archive">
                    <Archive className="h-4 w-4" />
                    <span>Archive</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={activeView === "trash"}>
                  <Link href="/trash">
                    <Trash2 className="h-4 w-4" />
                    <span>Trash</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <Button onClick={handleSignOut} variant="ghost" className="w-full justify-start gap-2" size="sm">
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </SidebarFooter>
    </Sidebar>
  )
}
