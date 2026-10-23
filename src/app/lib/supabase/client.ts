import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.https://esbveqnbdylksaizrhzd.supabase.co,
    process.env.sb_publishable_9yO0Ouxd0ZsYlJanUf7owA_q78vASvU
  );
}