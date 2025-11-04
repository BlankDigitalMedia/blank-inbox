# Performance Optimization - Convex Indexes & Pagination

## Summary
Added targeted database indexes and pagination limits to improve query performance for large datasets.

## Changes Made

### 1. Schema Updates (convex/schema.ts)
Added 4 new indexes to the emails table:
- **`by_read`** - Optimizes unread count queries by filtering on read status
- **`by_archived`** - Enables efficient archived email queries  
- **`by_trashed`** - Speeds up trash view queries
- **`by_draft`** - Improves draft list performance

Existing indexes retained:
- **`by_receivedAt`** - Chronological ordering (inbox, sent, starred)
- **`by_messageId`** - Idempotency check for webhook deduplication
- **`by_threadId`** - Thread grouping for conversation view

### 2. Query Optimizations (convex/emails.ts)

#### Updated queries with appropriate indexes and pagination:

**`list` (inbox)**
- Uses `by_receivedAt` index
- Added `.take(100)` limit
- Added pagination strategy comment for future cursor-based implementation

**`listDrafts`**
- Changed from `by_receivedAt` to `by_draft` index
- Added `.take(100)` limit

**`listArchived`**
- Changed from `by_receivedAt` to `by_archived` index
- Added `.take(100)` limit

**`listTrashed`**
- Changed from `by_receivedAt` to `by_trashed` index
- Added `.take(100)` limit

**`listSent`**
- Uses `by_receivedAt` index (unchanged)
- Added `.take(100)` limit

**`listStarred`**
- Uses `by_receivedAt` index (unchanged)
- Added `.take(100)` limit

**`unreadCount`**
- Added `by_read` index for fast filtering
- Kept `.collect()` (needs full count)

### 3. TypeScript Fixes
Fixed type errors unrelated to performance optimization:
- Updated `isFalseOrUndef` helper to use `any` type for Convex filter compatibility
- Fixed optional chaining in email parsing functions (composer, inline-reply-editor, use-sender-selection)
- Fixed IP address parsing in webhook handler
- Corrected Email type imports to use `@/lib/types` instead of `@/components/email-page`
- Fixed `emailDocToEmail` conversion in email-detail component

## Performance Impact

### Before
- Full table scans on filtered queries (archived, trashed, drafts)
- No pagination limits (potentially loading thousands of emails)
- Unread count query scanning entire table

### After
- Index-backed queries for O(log n) lookups
- 100-email pagination limit reduces memory usage and network transfer
- Unread count uses `by_read` index for faster filtering
- Ready for future cursor-based pagination enhancement

## Future Enhancements
Documented in code comments - consider implementing cursor-based pagination using Convex's `continueCursor`/`paginate()` API to support:
- Infinite scrolling
- Lazy loading of older emails
- Improved mobile experience

## Verification
✅ `npm run build` succeeds
✅ All TypeScript errors resolved
✅ Queries return expected results
✅ Schema migration ready for deployment
