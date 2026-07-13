// ============================================================
// /api/cron/daily-card — 매일 저녁 8시(KST) "인연 카드 도착" 알림
// vercel.json crons가 호출 (11:00 UTC) · CRON_SECRET 있으면 검증
// 목적: 고객이 인연함에 스스로 재방문하지 않아도, 후보가 있으면
//       문자를 보내 불러들인다 → 링크 진입 시 오늘의 카드가 생성됨
// ============================================================
import { sb } from "../../../../lib/supabase";
import { smsSafe, MSG } from "../../../../lib/sms";

export async function GET(req) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "인증 실패" }, { status: 401 });
  }
  const client = sb();
  if (!client) return Response.json({ error: "Supabase 미설정" }, { status: 500 });

  const today = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10); // KST 기준 날짜

  const { data: pool, error } = await client
    .from("leads")
    .select("id, name, phone, token, gender, birth, profile, match_optin")
    .eq("match_optin", true)
    .limit(500);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  // 인연함 온보딩(프로필 3단계)을 마친 사람만 — 아바타가 완주 신호
  const ready = (pool || []).filter(
    (l) => l.profile?.avatar && l.birth?.y && (l.gender === "M" || l.gender === "F") && l.phone
  );

  const origin = new URL(req.url).origin;
  let sent = 0;
  for (const me of ready) {
    if (me.profile?.lastCard === today) continue; // 오늘 이미 카드를 확인한 사람
    if (me.profile?.lastCardSms === today) continue; // 오늘 이미 알림을 보낸 사람 (중복 방지)
    const hasCandidate = ready.some((o) => o.id !== me.id && o.gender !== me.gender);
    if (!hasCandidate) continue; // 후보가 없으면 헛문자를 보내지 않는다
    const r = await smsSafe(me.phone, MSG.card(me.name, origin, me.token));
    if (r?.ok) {
      sent++;
      await client
        .from("leads")
        .update({ profile: { ...me.profile, lastCardSms: today } })
        .eq("id", me.id);
    }
  }
  return Response.json({ sent, ready: ready.length });
}
