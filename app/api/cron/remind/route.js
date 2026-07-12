// ============================================================
// /api/cron/remind — 매일 밤 10:30(KST) 미응답 매칭 리마인드 문자
// vercel.json crons가 호출 (13:30 UTC) · CRON_SECRET 있으면 검증
// ============================================================
import { sb } from "../../../../lib/supabase";
import { smsSafe, MSG } from "../../../../lib/sms";

export async function GET(req) {
  // Vercel Cron 인증 (CRON_SECRET 환경변수를 설정하면 자동으로 검증)
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "인증 실패" }, { status: 401 });
  }
  const client = sb();
  if (!client) return Response.json({ error: "Supabase 미설정" }, { status: 500 });

  // 최근 7일 내 생성된, 아직 응답이 비어 있는 매칭만
  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const { data: rows, error } = await client
    .from("matches")
    .select("*")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const pending = (rows || []).filter(
    (m) => m.a_accept !== false && m.b_accept !== false && !(m.a_accept === true && m.b_accept === true)
  );

  // 리마인드 대상: 응답이 null인 쪽 (사람당 1건만 — 카드 여러 장이어도 문자는 1통)
  const targets = new Map();
  for (const m of pending) {
    if (m.a_accept == null) targets.set(m.lead_a, true);
    if (m.b_accept == null) targets.set(m.lead_b, true);
  }
  if (!targets.size) return Response.json({ sent: 0 });

  const { data: leads } = await client
    .from("leads").select("id, name, phone, token").in("id", [...targets.keys()]);

  const origin = new URL(req.url).origin;
  let sent = 0;
  for (const l of leads || []) {
    const r = await smsSafe(l.phone, MSG.remind(l.name, origin, l.token));
    if (r?.ok) sent++;
  }
  return Response.json({ sent, targets: targets.size });
}
