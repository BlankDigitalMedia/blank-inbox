import { httpActionGeneric, httpRouter } from "convex/server";
import { api, internal } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/inbound",
  method: "POST",
  handler: httpActionGeneric(async (ctx, req) => {
    const payload = await req.json();
    
    // Insert email metadata immediately
    const docId = await ctx.runMutation(internal.emails.upsertFromInbound, { payload });
    
    // Extract Resend email_id from webhook payload
    const emailId = payload?.data?.email_id || payload?.email_id;
    
    // If this is a Resend webhook with email_id, schedule background fetch for body content
    if (emailId && docId) {
      await ctx.scheduler.runAfter(0, internal.emails.fetchResendBody, {
        docId,
        emailId,
        attempt: 1,
      });
    }
    
    return new Response("ok", { status: 200 });
  }),
});

export default http;


