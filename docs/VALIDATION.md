# Zod Validation Implementation

## Overview

All Convex server entry points now have comprehensive Zod validation for type safety and security hardening.

## Implementation

### Centralized Schemas (`lib/schemas.ts`)

All validation schemas are centralized in a single file with exported TypeScript types inferred from Zod schemas.

#### Webhook Payload Schemas

**`webhookPayloadSchema`** - Union type handling both Resend and inbound.new formats:
- Validates email_id, from, to, cc, bcc, subject, html, text
- Handles both nested format (Resend: `data.field`) and flat format (inbound.new: `field`)
- Validates threading headers: Message-ID, In-Reply-To, References, Reply-To
- Supports both string and array types for recipient fields

#### Email Mutation Schemas

**`sendEmailSchema`** - Email sending validation:
- `from`: Valid email address (email format enforced)
- `to`: Email list string with format validation
- `cc`, `bcc`: Optional email list strings
- `subject`, `html`, `text`: Required strings
- `originalEmailId`, `draftId`: Optional Convex ID types

**`saveDraftSchema`** - Draft save validation:
- `id`: Optional Convex ID (for updates)
- `from`, `subject`, `body`: Required strings
- `to`, `cc`, `bcc`, `threadId`: Optional strings

**`storeSentEmailSchema`** - Sent email storage validation:
- Similar to sendEmailSchema but includes `messageId`
- Supports threading with `originalEmailId` and `originalEmail`

#### Query Parameter Schemas

**`emailIdSchema`** - Email ID validation:
- `id`: Convex ID type

**`paginationSchema`** - Future pagination support:
- `cursor`: Optional string
- `limit`: Optional number (1-100 range)

### Server-Side Validation

#### Webhook Handler (`convex/http.ts`)

```typescript
const validationResult = webhookPayloadSchema.safeParse(rawPayload);
if (!validationResult.success) {
  await ctx.runMutation(internal.webhooks.logSecurityEvent, {
    ip: clientIp,
    eventType: "invalid_payload",
    details: validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; '),
  });
  return new Response("Invalid payload format", { status: 400 });
}
```

- Uses `.safeParse()` to avoid throwing errors
- Logs validation failures to security event log with detailed error messages
- Returns 400 Bad Request on validation failure
- Validated payload is type-safe for downstream processing

#### Email Mutations (`convex/emails.ts`)

All mutations now validate inputs using `.parse()`:

```typescript
// Example: toggleStar mutation
handler: async (ctx, args) => {
  await requireUserId(ctx);
  const { id } = emailIdSchema.parse(args);
  // ... rest of handler
}
```

**Validated mutations:**
- `toggleStar`, `toggleArchive`, `toggleTrash` - emailIdSchema
- `markRead`, `deleteEmail`, `deleteDraft` - emailIdSchema
- `storeSentEmail` - storeSentEmailSchema
- `sendEmail` - sendEmailSchema (action)
- `saveDraft` - saveDraftSchema
- `getById` - emailIdSchema (query)

### Email Format Validation

Custom validators for email fields:

**`emailString`** - Single email validation:
```typescript
z.string().email()
```

**`emailListString`** - Comma-separated email list validation:
```typescript
z.string().refine(
  (val) => {
    if (!val.trim()) return true; // Allow empty
    const emails = val.split(',').map(e => e.trim());
    return emails.every(email => z.string().email().safeParse(email).success);
  },
  { message: "Must be valid email address(es), comma-separated" }
)
```

## Security Benefits

1. **Input Sanitization**: All webhook payloads validated before processing
2. **Type Safety**: TypeScript types inferred from Zod schemas prevent runtime errors
3. **Attack Surface Reduction**: Invalid payloads rejected early with security logging
4. **Email Format Enforcement**: Prevents malformed email addresses from entering the system
5. **Audit Trail**: Validation failures logged to security event system

## Testing Validation

### Manual Testing Commands

Test invalid webhook payload (should return 400):
```bash
curl -X POST http://localhost:3000/inbound \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: your-secret" \
  -d '{"invalid": "payload"}'
```

Test invalid email format (should throw ZodError):
```javascript
// In Convex dashboard
api.emails.sendEmail({
  from: "invalid-email",  // Invalid format
  to: "test@example.com",
  subject: "Test",
  html: "<p>Test</p>",
  text: "Test"
})
```

### Verification

1. **Build passes**: `npm run build` completes without TypeScript errors
2. **TypeScript inference**: IDE autocomplete works for validated types
3. **Runtime validation**: Invalid payloads throw ZodError with descriptive messages
4. **Security logging**: Invalid webhooks logged to `webhookLogs` table

## Future Enhancements

- [ ] Add pagination validation to list queries when implemented
- [ ] Add custom error messages for all schema fields
- [ ] Add email domain allowlist/blocklist validation
- [ ] Add attachment size/type validation when file uploads are added
- [ ] Add rate limit validation for draft saves
- [ ] Export validation schemas for client-side form validation (with zod-form-data or react-hook-form)

## Notes

- Uses `.parse()` for strict validation (throws on invalid input)
- Uses `.safeParse()` for webhook validation (returns result object)
- Type assertions used in webhook handler after validation for union type handling
- All schemas export TypeScript types via `z.infer<>`
