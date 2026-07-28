import { createClient } from "@supabase/supabase-js";
import type { ToolContext } from "@lovable.dev/mcp-js";

/** Supabase client that runs as the signed-in MCP caller (RLS applies as that user). */
export function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function unauthenticated() {
  return {
    content: [{ type: "text" as const, text: "Not authenticated. Reconnect this MCP server." }],
    isError: true,
  };
}

export function errorResult(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true };
}

export function jsonResult(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data) }],
    structuredContent: { data } as Record<string, unknown>,
  };
}
