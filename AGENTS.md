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
- **UI**: shadcn/ui components with Radix UI primitives + Tailwind CSS
- **Email**: inbound.new webhook integration for receiving emails
- **Database**: Convex with emails table (from, subject, body, read/starred/archived status)
- **Routes**: `/` (inbox), `/archive`, `/starred`
- **Features**: Email archiving/unarchiving, starring/unstarring, multiple view filters

## Code Style Guidelines
- **TypeScript**: Strict mode enabled, target ES2017
- **Imports**: Use path aliases `@/*` for project root imports
- **Components**: shadcn/ui "new-york" style, RSC compatible
- **Styling**: Tailwind CSS with `cn()` utility for conditional classes
- **Linting**: ESLint with Next.js core-web-vitals + TypeScript rules
- **Naming**: camelCase for variables/functions, PascalCase for components
- **Error Handling**: Standard try/catch, no custom error boundaries yet
