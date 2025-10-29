## Template Builder: Implementation Overview

This document describes the exact implementation of the Templates feature in this app, including the route, client logic, builder configuration, styling overrides, persistence, and utilities.

## Route and Entry Points

- **Path**: `/templates`
- **File**: `app/templates/page.tsx` (client component)
- **Primary UI elements**:
  - `SidebarProvider` + `MailSidebar` to maintain the app frame.
  - Header with template selector, name and description inputs, undo/redo, publish, and save status.
  - Main content area rendering `TemplateBuilder`.

## Data Model and Backend (Convex)

- **Table**: `templates` in `convex/schema.ts`
  - Fields: `name` (string), `description` (optional string), `content` (any), `createdAt` (number), `updatedAt` (number)
  - Index: `by_updatedAt` on `updatedAt`
- **Functions**: `convex/templates.ts`
  - `list` (query): returns all templates ordered by `updatedAt` descending via `by_updatedAt` index.
  - `get` (query): returns a single template by id.
  - `upsert` (mutation): insert when `id` is absent; otherwise `patch` existing record. Sets `createdAt`/`updatedAt` timestamps on insert; `updatedAt` on update.
  - `remove` (mutation): deletes a template by id.

## Client Logic (app/templates/page.tsx)

- **Types**
  - `TemplateRecord`: mirrors the Convex `templates` row plus `_id` and timestamps.
  - `SavePayload`: payload passed into the `upsert` mutation.

- **Data Fetching / Mutations**
  - `useQuery(api.templates.list)`: fetches available templates (returns `TemplateRecord[] | undefined`).
  - `useMutation(api.templates.upsert)`: used for both creating and saving updates.

- **Local State**
  - `selectedTemplateId: Id<"templates"> | null` — currently selected template id.
  - `nameDraft: string`, `descriptionDraft: string` — header inputs bound to current template values.
  - `editorState: Data` — Puck editor data; initialized from `defaultTemplateData` and normalized by `ensureTemplateContentIds`.
  - `isCreating: boolean` — disables create button while creating.
  - `isSaving: boolean` — shows spinner in header while a save is in flight.
  - `lastSavedAt: number | null` — for rendering "Saved HH:MM:SS".

- **Refs**
  - `saveTimer: NodeJS.Timeout | null` — debounced save timer (800ms).
  - `pendingSave: SavePayload | null` — most recent queued save request for the debounce.
  - `latestTemplateId: Id<"templates"> | null` — tracks current template id across renders and creations.
  - `isMounted: boolean` — suppresses UI state updates after unmount while still awaiting save promises.
  - `historyRef: { past: Data[]; future: Data[] }` — undo/redo history ring buffer (kept to max 50 past snapshots).

- **Selection and Initialization**
  - On first load, if templates exist and no selection has been made, the first template is selected.
  - Whenever `selectedTemplate` changes, the page:
    - Loads `content` or falls back to a clone of `defaultTemplateData`.
    - Normalizes the data with `ensureTemplateContentIds`.
    - Sets `nameDraft`, `descriptionDraft`, `editorState`, resets history, and updates `latestTemplateId`.
    - If normalization changed the data, schedules a save to persist the normalized `content`.

- **Saving Model**
  - `runSave(payload)`: calls `upsert`, toggles `isSaving`, updates `lastSavedAt` on success, and shows a success toast only when no further `pendingSave` exists.
  - `scheduleSave(payload)`: debounces saves by 800ms using `saveTimer`; only the latest `pendingSave` is persisted when the timer fires.
  - `flushSave()`: clears any timer and, if a `pendingSave` exists, saves immediately. Used before switching templates, publishing, and on unmount.
  - A cleanup effect runs on unmount: clears timers, flushes any `pendingSave`, and flips `isMounted` to false.

- **Undo / Redo**
  - `pushHistory(prev)`: takes a deep clone via `structuredClone` and stores snapshots, skipping duplicates; limits `past` to 50 entries; clears `future` on new user edits.
  - `handleUndo()`: pops from `past` into `editorState`, pushes current state into `future`, and schedules a save for the restored data.
  - `handleRedo()`: pops from `future` into `editorState`, pushes current state into `past`, and schedules a save for the restored data.

- **Keyboard Shortcuts**
  - `Cmd/Ctrl+S`: calls `flushSave()`.
  - `Cmd/Ctrl+Z`: undo; `Shift+Cmd/Ctrl+Z`: redo.

- **Create / Select / Publish**
  - `handleCreateTemplate()`: deep-clones `defaultTemplateData`, normalizes ids, creates a new template via `upsert` (without `id`), then sets all local state to the new template values and updates `lastSavedAt`.
  - `handleSelectTemplate(id)`: flushes pending saves and switches the selection.
  - `handlePublishClick()`: flushes pending saves and shows a "Published" toast. No additional server action beyond persisting the current content.

- **Editor Change Handling**
  - `handleEditorChange(data)`: normalizes ids with `ensureTemplateContentIds`, pushes the previous state into history, sets `editorState`, and schedules a save using the latest id and current header inputs as fallbacks.
  - `handleNameChange(value)` and `handleDescriptionChange(value)`: update the corresponding draft, then schedule a save with normalized inputs.

- **Header UI Behavior**
  - Template selector: rendered when templates exist; bound to `_id`.
  - Name and description inputs: bound to `nameDraft`/`descriptionDraft` and trigger `scheduleSave` when changed.
  - Undo/Redo buttons: enabled based on history stacks.
  - Publish button: triggers `handlePublishClick`.
  - Save status: shows spinner while `isSaving` or a `pendingSave` exists; otherwise shows last saved time.

## Template Builder Component (components/templates/template-builder.tsx)

- **Imports and Setup**
  - Uses `@measured/puck` (`Puck`, `Config`, `Data`) and its default stylesheet, plus a local override stylesheet `puck-overrides.css`.
  - Renders blocks using `@react-email/components` primitives: `Section`, `Heading`, `Text`, `Button` (aliased as `EmailButton`), `Img`, `Hr`.
  - Normalizes Puck `Data` with `ensureTemplateContentIds` both on mount and on every change/publication.

- **Config: Root**
  - `root.label`: "Email".
  - `root.fields`:
    - `backgroundColor: text` — page background (default `#f4f4f5`).
    - `contentBackground: text` — inner content background (default `#ffffff`).
    - `contentWidth: number` — max width in px (default `600`, min `320`, max `800`, step `10`).
    - `outerPadding: number` — outer padding in px (default `32`, min `0`, max `64`, step `4`).
  - `root.render`: centers a max-width container with rounded corners and `fontFamily: Helvetica, Arial, sans-serif`, applies background/padding, and renders `children`.

- **Config: Components**
  - `Hero`
    - Label: "Hero"
    - Fields:
      - `eyebrow: text` (default "New feature")
      - `headline: text` (default "Create beautiful emails in minutes")
      - `description: textarea` (default marketing copy)
      - `buttonText: text` (default "Get started")
      - `buttonUrl: text` (default `https://example.com`)
      - `imageUrl: text` (default Unsplash image)
      - `align: radio` — options `left`/`center` (default `center`)
    - Render: `Section` with padding and optional `Img`; `Text` eyebrow (uppercase, letter spaced, color `#6366f1`); `Heading` as `h1`; `Text` description; primary `EmailButton` (`#4338ca` background, white text).

  - `HeadingBlock`
    - Label: "Heading"
    - Fields:
      - `text: text` (default "A standout headline")
      - `level: select` — options `h2`/`h3` (default `h2`)
      - `align: radio` — options `left`/`center` (default `left`)
    - Render: `Section` with a `Heading` sized based on `level` and aligned.

  - `TextBlock`
    - Label: "Text"
    - Fields:
      - `content: textarea` (default descriptive copy)
      - `align: radio` — options `left`/`center` (default `left`)
    - Render: `Section` with a `Text` paragraph (`#4b5563` color).

  - `ButtonBlock`
    - Label: "Button"
    - Fields:
      - `text: text` (default "Call to action")
      - `url: text` (default `https://example.com`)
      - `variant: radio` — `primary` or `outline` (default `primary`)
      - `align: radio` — `left` or `center` (default `center`)
    - Render: `Section` with centered/left `EmailButton`; primary (`#4338ca` bg, white text) or outline (transparent bg, `#4338ca` border/text) styles.

  - `SpacerBlock`
    - Label: "Spacer"
    - Fields:
      - `height: number` (default `24`, min `8`, max `96`, step `4`)
    - Render: fixed-height `div` (uses numeric or parsed number).

  - `DividerBlock`
    - Label: "Divider"
    - Fields:
      - `color: text` (default `#e4e4e7`)
    - Render: `Section` with `Hr` using provided color.

  - `Footer`
    - Label: "Footer"
    - Fields:
      - `content: textarea` (default unsubscribe-style copy)
    - Render: `Section` with muted, centered `Text` on a light background.

- **Default Data**
  - `defaultTemplateData`: Root props preconfigured with brand-neutral colors and dimensions; `content` includes `Hero`, `HeadingBlock` ("What you can build"), `TextBlock`, `ButtonBlock` ("Build your next campaign"), and `Footer`. Each block props include an `id` seed which is normalized into `props.id` via `ensureTemplateContentIds`.

- **Component API**
  - Props: `{ value: Data; onChange?: (data: Data) => void; onPublish?: (data: Data) => void }`.
  - On mount and on every change, the component normalizes the `Data` and forwards the normalized payload to `onChange`/`onPublish` when provided.
  - `overrides` passed to `Puck`:
    - `header`: renders children only (no default Puck header wrapper).
    - `headerActions`: renders children only.

## Styling Overrides (components/templates/puck-overrides.css)

- Establishes brand variables on `.puck-host` and `.puck-host .Puck` and forces 100% height to fit the app frame.
- Hides Puck default chrome (header, toolbar/topbar) to integrate with the app header.
- Ensures preview scaling origins and iframe sizing are top-aligned and full-size.
- Removes fixed preview heights from default CSS.
- Re-themes panels/cards to match the app background/border radius without shadows.
- Adds padding and subtle background to the canvas; compacts controls and tabs; brands primary actions with the app primary color.
- Adds drag-and-drop visual feedback using dashed outlines and subtle background while dragging.

## Utility: ensureTemplateContentIds (lib/template-utils.ts)

- `createTemplateBlockId()`: uses `crypto.randomUUID()` when available; falls back to a timestamp/random based id.
- `ensureTemplateContentIds(data: Data | undefined): [Data, boolean]`
  - Normalizes `data.content` and any nested `zones` arrays.
  - Guarantees a stable, unique `props.id` on every block; removes any top-level `id`/`key` fields on items.
  - De-duplicates ids by appending a generated suffix when collisions are detected in the same normalization pass.
  - Returns `[nextData, changed]`, where `changed` indicates if normalization mutated the input structure (ids added/updated or arrays filtered/rewritten).

## Integration Details

- The page component stores editor data in `editorState` and uses `TemplateBuilder` as a controlled component via `value` and `onChange`.
- All saved `content` in Convex is stored as the normalized Puck `Data` structure.
- The UI header operates independently of Puck; Puck header is suppressed using overrides and CSS.
- Debounced persistence ensures responsive editing while minimizing write frequency; immediate persistence is triggered on publish, template switches, and unmount.
- Undo/Redo history is maintained at the page level, not within `TemplateBuilder`.

## Dependencies

- `@measured/puck` — drag-and-drop editor and `Data` model.
- `@react-email/components` — email-safe React primitives for rendering.
- `convex` — serverless database and functions (`useQuery`, `useMutation`).
- `sonner` — toast notifications for save/publish confirmations.
- `lucide-react` — icons used in the header (Plus, Loader2, Undo2, Redo2, Upload).
- shadcn/ui components — `Button`, `Input`, `Select`, `Separator` used in the header.

## Route UI Structure (Summary)

- Sidebar frame: `SidebarProvider`, `MailSidebar activeView="templates"`, `SidebarInset`.
- Header: template selector, `name` and `description` inputs, undo/redo controls, publish button, and save status.
- Content: `TemplateBuilder` hosting Puck within `.puck-host`, full height within the app layout.


