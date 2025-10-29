# AGENTS.md - Blank Inbox Project

## Build/Lint/Test Commands
- `npm run dev` - Start Next.js development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- No test commands configured yet

## Architecture
- **Frontend**: Next.js 15 + React 19 + TypeScript with App Router
- **Backend**: Convex (serverless functions + database)
- **UI**: shadcn/ui components with Radix UI primitives + Tailwind CSS + Sonner for toast notifications + next-themes for dark/light mode
- **Email**: Dual-format webhook integration (supports both Resend and inbound.new) for receiving emails at `/inbound` endpoint, @inboundemail/sdk for sending (migration to Resend in progress)
- **Database**: Convex with emails table (from, to, cc, bcc, subject, preview, body, read/starred/archived/trashed/draft status, receivedAt, messageId, threadId, category)
- **Routes**: `/` (inbox), `/archive`, `/starred`, `/sent`, `/compose`, `/drafts`, `/trash`
- **Analytics**: Vercel Analytics for tracking usage
- **Dependencies**: Additional libraries include react-hook-form, zod (for form validation), cmdk (for search/command palette), date-fns (for date handling), lucide-react (for icons), react-resizable-panels (for resizable layouts), recharts (for data visualization), tailwind-merge (for class merging), @tiptap/react, @tiptap/starter-kit (for rich text editing in composer)
- **Layout**: Fixed viewport frame with internal scrolling
  - Root body uses `h-dvh overflow-hidden` to prevent page scroll
  - Each section (sidebar, email list, detail) has sticky headers with internal `overflow-y-auto` content
  - All 4 corners of the frame remain visible at all times
- **Composer**: Unified Composer component handles all email composition with rich text editing using TipTap
  - Supports modes: `inline` (for replies within email detail) and `modal` (for new composition via Dialog)
  - Supports intents: `new`, `reply`, `replyAll`, `forward`
  - Smart sender selection based on original recipient
  - Smooth animations and focus management
  - Located at `components/composer/composer.tsx`
- **Features**:
  - Email archiving/unarchiving, starring/unstarring, trashing/restoring, multiple view filters
  - HTML email body rendering with DOMPurify sanitization
  - Dynamic unread email count in navigation
  - Chronological sorting (most recent emails first)
  - Unified compose/reply/forward experience with modern UX
  - Reply to emails functionality with pre-filled subject and recipient
  - Reply all to emails functionality with smart sender selection
  - Forward emails functionality with quoted original message
  - Dark/light theme toggle
  - Toast notifications for user feedback (success/error messages)
  - Search input placeholder in sidebar (functionality not yet implemented)
  - Email threading support (threadId stored and UI implemented in detail view)

## Code Style Guidelines
- **TypeScript**: Strict mode enabled, target ES2017
- **Imports**: Use path aliases `@/*` for project root imports
- **Components**: shadcn/ui "new-york" style, RSC compatible, shared components preferred over duplication (refactored email views to use shared `EmailPage`, `EmailList`, and `EmailDetail` components)
- **Styling**: Tailwind CSS with `cn()` utility for conditional classes
- **Linting**: ESLint with Next.js core-web-vitals + TypeScript rules
- **Naming**: camelCase for variables/functions, PascalCase for components
- **Error Handling**: Standard try/catch, no custom error boundaries yet
- **Architecture**: Single shared components for email views (e.g., `MailSidebar`, `EmailPage`, `EmailList`, `EmailDetail`, `Composer`) over view-specific duplicates; drafts use separate `DraftList` and `DraftDetail` components
