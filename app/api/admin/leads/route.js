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
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ leads: data });
}

export async function PATCH(req) {
  if (!authorized(req)) return Response.json({ error: "인증 실패" }, { status: 401 });
  const _body = await req.clone().json().catch(() => ({}));
  const client0 = sb();

  // v26.1: 매칭 제외/복귀 — 테스트 인원을 풀에서 빼는 오너 스위치
  if (_body.action === "matchOff" || _body.action === "matchOn") {
    const on = _body.action === "matchOn";
    const { error } = await client0.from("leads").update({ match_optin: on }).eq("id", _body.id);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    if (!on) {
      // 걸려 있는 미성사 실 회수 (성사된 건은 보존)
      await client0.from("matches").delete()
        .or(`lead_a.eq.${_body.id},lead_b.eq.${_body.id}`)
        .not("status", "eq", "matched");
    }
    return Response.json({ ok: true });
  }

  // v26.1: 회원 완전 삭제 — 매칭 기록까지 (감정서 포함 복구 불가)
  if (_body.action === "delete") {
    await client0.from("matches").delete().or(`lead_a.eq.${_body.id},lead_b.eq.${_body.id}`);
    const { error } = await client0.from("leads").delete().eq("id", _body.id);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ ok: true });
  }

  const { id, paid } = await req.json();
  const client = sb();
  if (!client) return Response.json({ error: "Supabase 미설정" }, { status: 500 });
  const { error } = await client.from("leads").update({ paid }).eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
