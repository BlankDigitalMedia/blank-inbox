import type { Metadata } from 'next'

import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { ConvexClientProvider } from '@/lib/convex-provider'
import { ThemeProvider } from 'next-themes'
import { Toaster } from '@/components/ui/sonner'
import { ComposeProvider } from '@/app/providers/compose-provider'
import { ComposeDock } from '@/components/composer/compose-dock'
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server"
import { Geist, Geist_Mono, Geist as BlankInbox_Font_Geist, Geist_Mono as BlankInbox_Font_Geist_Mono, Source_Serif_4 as BlankInbox_Font_Source_Serif_4 } from 'next/font/google'

// Initialize fonts
const geist = BlankInbox_Font_Geist({ subsets: ['latin'], weight: ["100","200","300","400","500","600","700","800","900"] })
const geistMono = BlankInbox_Font_Geist_Mono({ subsets: ['latin'], weight: ["100","200","300","400","500","600","700","800","900"] })
const sourceSerif_4 = BlankInbox_Font_Source_Serif_4({ subsets: ['latin'], weight: ["200","300","400","500","600","700","800","900"] })

export const metadata: Metadata = {
  title: 'Blank Inbox',
  description: 'Created with blank-inbox',
  generator: 'blank-inbox',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans antialiased h-dvh overflow-hidden`}>
        <ConvexAuthNextjsServerProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <ConvexClientProvider>
              <ComposeProvider>
                {children}
                <ComposeDock />
                <Toaster />
              </ComposeProvider>
            </ConvexClientProvider>
          </ThemeProvider>
          <Analytics />
        </ConvexAuthNextjsServerProvider>
      </body>
    </html>
  )
}
