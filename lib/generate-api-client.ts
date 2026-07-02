import { createSupabaseBrowserClient } from "@/lib/supabase";
import type { RecordFormPayload } from "@/lib/types";

export async function postGenerateApi(endpoint: string, payload: RecordFormPayload) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };

  const supabase = createSupabaseBrowserClient();
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }
  }

  return fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  });
}
