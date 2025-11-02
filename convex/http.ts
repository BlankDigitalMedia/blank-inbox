import { httpActionGeneric, httpRouter } from "convex/server";
import { api, internal } from "./_generated/api";
import { auth } from "./auth";

const http = httpRouter();

auth.addHttpRoutes(http);

http.route({
  path: "/inbound",
  method: "POST",
  handler: httpActionGeneric(async (ctx, req) => {
    const payload = await req.json();
    
    // Insert email metadata and body (if available) immediately
    const docId = await ctx.runMutation(internal.emails.upsertFromInbound, { payload });
    
    // Extract Resend email_id from webhook payload
    const emailId = payload?.data?.email_id || payload?.email_id;
    const data = payload?.data || payload;
    
    // Only schedule background fetch if body is not already populated
    // (i.e., if html/text fields were not in the webhook payload)
    const hasBody = data?.html || data?.text;
    
    if (emailId && docId && !hasBody) {
      await ctx.scheduler.runAfter(0, internal.emails.fetchEmailBodyFromResend, {
        docId,
        emailId,
        attempt: 1,
      });
    }
    
    return new Response("ok", { status: 200 });
  }),
});

export default http;


