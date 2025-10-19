import { httpActionGeneric, httpRouter } from "convex/server";
import { internal } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/inbound",
  method: "POST",
  handler: httpActionGeneric(async (ctx, req) => {
    const payload = await req.json();
    await ctx.runMutation(internal.emails.upsertFromInbound, { payload });
    return new Response("ok", { status: 200 });
  }),
});

export default http;


