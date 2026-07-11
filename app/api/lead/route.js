// ============================================================
// /api/lead — 디비(리드) 저장 및 퀴즈 결과 업데이트
// ============================================================
import { sb } from "../../../lib/supabase";

export async function POST(req) {
  try {
    const body = await req.json();
    const { name, phone, birth, salNames, salCount } = body;
    if (!name || !phone || !birth) {
      return Response.json({ error: "필수 정보가 누락되었습니다." }, { status: 400 });
    }
    const client = sb();
    if (!client) {
      // Supabase 미설정 시에도 퍼널은 계속 진행 (저장만 생략)
      console.warn("Supabase 미설정 — 리드가 저장되지 않았습니다.");
      return Response.json({ id: null, saved: false });
    }
    const token = crypto.randomUUID().replace(/-/g, "").slice(0, 20);
    const { data, error } = await client
      .from("leads")
      .insert({ name, phone: String(phone).replace(/[^0-9]/g, ""), birth, sal_names: salNames || [], sal_count: salCount ?? null, token })
      .select("id, token")
      .single();
    if (error) throw error;
    return Response.json({ id: data.id, token: data.token, saved: true });
  } catch (e) {
    console.error(e);
    return Response.json({ id: null, saved: false });
  }
}

export async function PATCH(req) {
  try {
    const { id, quizHits, intro, matchOptin, profile } = await req.json();
    const client = sb();
    if (!client || !id) return Response.json({ ok: false });
    const upd = {};
    if (quizHits !== undefined) upd.quiz_hits = quizHits;
    if (intro !== undefined) upd.intro = String(intro).slice(0, 500);
    if (matchOptin !== undefined) upd.match_optin = !!matchOptin;
    if (profile !== undefined) upd.profile = profile;
    if (Object.keys(upd).length === 0) return Response.json({ ok: false });
    const { error } = await client.from("leads").update(upd).eq("id", id);
    if (error) { console.error(error.message); return Response.json({ ok: false }); }
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ ok: false });
  }
}
