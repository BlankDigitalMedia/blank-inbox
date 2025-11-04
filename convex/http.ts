import { httpActionGeneric, httpRouter } from "convex/server";
import { api, internal } from "./_generated/api";
import { auth } from "./auth";
import { webhookPayloadSchema, type WebhookPayload } from "@/lib/schemas";
import { logError, logInfo } from "@/lib/logger";

const http = httpRouter();

auth.addHttpRoutes(http);

/**
 * GLOBAL HTTP LIMITS
 * 
 * Purpose: Prevent DoS attacks and abuse of webhook endpoints
 * 
 * - MAX_BODY_SIZE: 256KB for webhook payloads (email metadata only, bodies fetched separately)
 * - RATE_LIMIT_PER_MINUTE: 60 requests per IP per minute (1 req/second sustained)
 * - METHOD: POST only for /inbound endpoint (enforced by route definition)
 * 
 * To adjust limits:
 * 1. Modify constants below
 * 2. Update documentation in WEBHOOK_SECURITY_SUMMARY.md
 * 3. Test with test-webhook-security.sh
 */
const MAX_BODY_SIZE = 256 * 1024; // 256KB
const RATE_LIMIT_PER_MINUTE = 60;

/**
 * Webhook endpoint for receiving inbound emails
 * 
 * SECURITY LAYERS (defense in depth):
 * 1. HTTP Method: POST only (GET/PUT/DELETE/etc rejected by router)
 * 2. Content-Length: Checked before body parsing (DoS prevention)
 * 3. Content-Type: Must be application/json (format enforcement)
 * 4. Authentication: X-Webhook-Secret header required (unauthorized access prevention)
 * 5. Rate Limiting: 60 req/min per IP (abuse prevention)
 * 6. Payload Validation: Zod schema validation (malformed data rejection)
 * 7. Idempotency: messageId index prevents duplicate emails
 * 
 * Attack surface: Public webhook URL
 * Threat model: DDoS, unauthorized access, payload injection, replay attacks
 */
http.route({
  path: "/inbound",
  method: "POST", // Only POST allowed - GET/PUT/DELETE/PATCH rejected
  handler: httpActionGeneric(async (ctx, req) => {
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > MAX_BODY_SIZE) {
      await ctx.runMutation(internal.webhooks.logSecurityEvent, {
        ip: clientIp,
        eventType: "payload_too_large",
        details: `Size: ${contentLength} bytes`,
      });
      return new Response("Payload Too Large", { status: 413 });
    }

    const contentType = req.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      await ctx.runMutation(internal.webhooks.logSecurityEvent, {
        ip: clientIp,
        eventType: "invalid_content_type",
        details: contentType || "missing",
      });
      return new Response("Content-Type must be application/json", { status: 415 });
    }

    const secret = req.headers.get("x-webhook-secret");
    const expectedSecret = process.env.INBOUND_WEBHOOK_SECRET;
    
    if (!expectedSecret) {
      logError("INBOUND_WEBHOOK_SECRET not configured", {
        ip: clientIp,
        action: "webhook_inbound",
      });
      return new Response("Internal Server Error", { status: 500 });
    }

    if (!secret || secret !== expectedSecret) {
      await ctx.runMutation(internal.webhooks.logSecurityEvent, {
        ip: clientIp,
        eventType: "invalid_signature",
        details: secret ? "wrong_secret" : "missing_secret",
      });
      return new Response("Unauthorized", { status: 401 });
    }

    const rateLimitOk = await ctx.runMutation(internal.webhooks.checkRateLimit, {
      ip: clientIp,
      limit: RATE_LIMIT_PER_MINUTE,
    });

    if (!rateLimitOk) {
      await ctx.runMutation(internal.webhooks.logSecurityEvent, {
        ip: clientIp,
        eventType: "rate_limit_exceeded",
      });
      return new Response("Too Many Requests", { status: 429 });
    }

    const rawPayload = await req.json();
    
    // Validate webhook payload
    const validationResult = webhookPayloadSchema.safeParse(rawPayload);
    if (!validationResult.success) {
      await ctx.runMutation(internal.webhooks.logSecurityEvent, {
        ip: clientIp,
        eventType: "invalid_payload",
        details: validationResult.error.errors.map((e: { path: (string | number)[]; message: string }) => `${e.path.join('.')}: ${e.message}`).join('; '),
      });
      return new Response("Invalid payload format", { status: 400 });
    }
    
    const payload: WebhookPayload = validationResult.data;
    // Debug shape (no PII): helps diagnose blank fields from providers
    try {
      /* eslint-disable @typescript-eslint/no-explicit-any */
      const shape = {
        hasData: typeof (payload as any)?.data === 'object',
        hasEmail: typeof (payload as any)?.email === 'object',
        hasHeaders: typeof ((payload as any)?.data?.headers || (payload as any)?.email?.headers || (payload as any)?.headers) === 'object',
        hasHtml: !!((payload as any)?.data?.html || (payload as any)?.email?.html || (payload as any)?.html),
        hasText: !!((payload as any)?.data?.text || (payload as any)?.email?.text || (payload as any)?.text),
        hasCleanedContent: typeof (payload as any)?.email?.cleanedContent === 'object',
        keys: Object.keys(payload as Record<string, unknown>),
      }
      /* eslint-enable @typescript-eslint/no-explicit-any */
      logInfo("Webhook payload shape", { action: "webhook_inbound_shape", metadata: shape })
    } catch {}
    
    const docId = await ctx.runMutation(internal.emails.upsertFromInbound, { payload });
    
    // Handle both Resend format (nested data) and inbound.new/flat format
    const isObj = (val: unknown): val is Record<string, unknown> => typeof val === 'object' && val !== null;
    const getStr = (obj: Record<string, unknown> | undefined, key: string): string | undefined => {
      if (!obj) return undefined;
      const val = obj[key];
      return typeof val === 'string' ? val : undefined;
    };

    const root: Record<string, unknown> = isObj(payload) ? payload : {};
    const nested: Record<string, unknown> | undefined = isObj(root['data']) ? (root['data'] as Record<string, unknown>) : undefined;
    const isResendPayload = !!nested;
    const emailId = isResendPayload ? getStr(nested, 'email_id') : getStr(root, 'email_id');
    const data: Record<string, unknown> = (isResendPayload ? nested : root) || {};
    
    const hasBody = !!(getStr(data, 'html') || getStr(data, 'text'));
    
    // Only fetch from Resend API if:
    // 1. This is a Resend payload (has 'data' property)
    // 2. We have an emailId and docId
    // 3. The body is missing
    if (isResendPayload && emailId && docId && !hasBody) {
      await ctx.scheduler.runAfter(0, internal.emails.fetchEmailBodyFromResend, {
        docId,
        emailId,
        attempt: 1,
      });
    }
    
    logInfo("Email webhook processed successfully", {
      ip: clientIp,
      action: "webhook_inbound",
      emailId: String(docId),
      metadata: { 
        hasBody, 
        isResendPayload,
        scheduledFetch: isResendPayload && !!emailId && !!docId && !hasBody 
      },
    });
    
    return new Response("ok", { status: 200 });
  }),
});

export default http;


