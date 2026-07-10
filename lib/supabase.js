// 서버 전용 Supabase 클라이언트 (service role key 사용 — 클라이언트에 노출 금지)
import { createClient } from "@supabase/supabase-js";

export function sb() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}
