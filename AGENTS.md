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
- **UI**: shadcn/ui components with Radix UI primitives + Tailwind CSS + Sonner for toast notifications
- **Email**: inbound.new webhook integration for receiving emails, @inboundemail/sdk for sending
- **Database**: Convex with emails table (from, to, subject, body, read/starred/archived/trashed/draft status, receivedAt, messageId, threadId, category)
- **Routes**: `/` (inbox), `/archive`, `/starred`, `/sent`, `/compose`, `/drafts`, `/trash`
- **Features**:
  - Email archiving/unarchiving, starring/unstarring, trashing/restoring, multiple view filters
  - HTML email body rendering with DOMPurify sanitization
  - Dynamic unread email count in navigation
  - Chronological sorting (most recent emails first)
  - Compose new emails with draft saving functionality
  - Draft management (save, edit, delete drafts)
  - Toast notifications for user feedback (success/error messages)

## Code Style Guidelines
- **TypeScript**: Strict mode enabled, target ES2017
- **Imports**: Use path aliases `@/*` for project root imports
- **Components**: shadcn/ui "new-york" style, RSC compatible, shared components preferred over duplication
- **Styling**: Tailwind CSS with `cn()` utility for conditional classes
- **Linting**: ESLint with Next.js core-web-vitals + TypeScript rules
- **Naming**: camelCase for variables/functions, PascalCase for components
- **Error Handling**: Standard try/catch, no custom error boundaries yet
- **Architecture**: Single shared components (e.g., `MailSidebar`) over view-specific duplicates
