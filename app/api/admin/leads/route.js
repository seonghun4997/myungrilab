// ============================================================
// /api/admin/leads — 리드 목록 조회 / 결제 표시 토글 (ADMIN_KEY 필요)
// ============================================================
import { sb } from "../../../../lib/supabase";

function authorized(req) {
  const key = req.headers.get("x-admin-key");
  return key && process.env.ADMIN_KEY && key === process.env.ADMIN_KEY;
}

export async function GET(req) {
  if (!authorized(req)) return Response.json({ error: "인증 실패" }, { status: 401 });
  const client = sb();
  if (!client) return Response.json({ error: "Supabase가 설정되지 않았습니다." }, { status: 500 });
  const { data, error } = await client
    .from("leads")
    .select("id, created_at, name, phone, birth, sal_names, sal_count, quiz_hits, paid, token")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ leads: data });
}

export async function PATCH(req) {
  if (!authorized(req)) return Response.json({ error: "인증 실패" }, { status: 401 });
  const { id, paid } = await req.json();
  const client = sb();
  if (!client) return Response.json({ error: "Supabase 미설정" }, { status: 500 });
  const { error } = await client.from("leads").update({ paid }).eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
