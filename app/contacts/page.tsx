"use client"

import { useState, useMemo } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { MailSidebar } from "@/components/mail-sidebar"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ContactList } from "@/components/contacts/contact-list"
import { ContactDetail } from "@/components/contacts/contact-detail"
import { NewContactDialog } from "@/components/contacts/new-contact-dialog"
import { useIsLargeScreen } from "@/hooks/use-is-large-screen"
import { Plus } from "lucide-react"

export default function ContactsPage() {
  const contacts = useQuery(api.contacts.listContacts, {})
  const [selectedContactId, setSelectedContactId] = useState<Id<"contacts"> | null>(null)
  const [search, setSearch] = useState("")
  const [newContactDialogOpen, setNewContactDialogOpen] = useState(false)

  const isLg = useIsLargeScreen()

  const filteredContacts = useMemo(() => {
    if (!contacts) return []
    if (!search.trim()) return contacts

    const searchLower = search.toLowerCase()
    return contacts.filter((contact) => {
      const nameMatch = contact.name?.toLowerCase().includes(searchLower)
      const emailMatch = contact.primaryEmail.toLowerCase().includes(searchLower)
      return nameMatch || emailMatch
    })
  }, [contacts, search])

  const selectedContact = useMemo(() => {
    if (!selectedContactId || !contacts) return null
    return contacts.find((c) => c._id === selectedContactId) ?? null
  }, [selectedContactId, contacts])

  const showList = isLg || (!isLg && !selectedContact)
  const showDetail = isLg || (!isLg && !!selectedContact)

  const handleBack = () => {
    setSelectedContactId(null)
  }

  const handleContactCreated = (contactId: Id<"contacts">) => {
    setSelectedContactId(contactId)
  }

  return (
    <SidebarProvider>
      <MailSidebar activeView="contacts" />
      <SidebarInset>
        <div className="flex h-full flex-col overflow-hidden">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <SidebarTrigger className="-ml-1" />
            <h1 className="text-lg font-semibold">Contacts</h1>
            <div className="ml-auto">
              <Button onClick={() => setNewContactDialogOpen(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Contact
              </Button>
            </div>
          </header>
          <div className="flex flex-1 min-h-0 overflow-hidden">
            {/* List pane */}
            <div className={showList ? "flex w-full lg:w-96 flex-col" : "hidden lg:flex w-full lg:w-96 flex-col"}>
              <div className="p-4 border-b">
                <Input
                  placeholder="Search contacts..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full"
                  aria-label="Search contacts"
                />
              </div>
              <ContactList
                contacts={filteredContacts}
                selectedContactId={selectedContactId}
                onSelectContact={setSelectedContactId}
              />
            </div>

            {/* Detail pane */}
            <div className={showDetail ? "flex flex-1 min-w-0" : "hidden lg:flex flex-1 min-w-0"}>
              <ContactDetail
                contact={selectedContact}
                onBack={handleBack}
              />
            </div>
          </div>
        </div>
        <NewContactDialog
          open={newContactDialogOpen}
          onOpenChange={setNewContactDialogOpen}
          onCreated={handleContactCreated}
        />
      </SidebarInset>
    </SidebarProvider>
  )
}

