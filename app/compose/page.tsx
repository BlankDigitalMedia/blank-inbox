import { Suspense } from "react"
import { MailSidebar } from "@/components/mail-sidebar"
import { ComposeEmail } from "@/components/compose-email"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"

export default function ComposePage() {
  return (
    <SidebarProvider>
      <MailSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <h1 className="text-lg font-semibold">Compose</h1>
        </header>
        <Suspense fallback={<div>Loading...</div>}>
          <ComposeEmail />
        </Suspense>
      </SidebarInset>
    </SidebarProvider>
  )
}
