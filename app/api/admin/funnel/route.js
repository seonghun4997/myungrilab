// ============================================================
// /api/admin/funnel — 고객 여정 깔때기 (DB 기반 하단 퍼널)
// 상단 퍼널(방문→문답→디비)은 Vercel Analytics 이벤트로 확인
// ============================================================
import { sb } from "../../../../lib/supabase";

function authorized(req) {
  const key = req.headers.get("x-admin-key");
  return key && process.env.ADMIN_KEY && key === process.env.ADMIN_KEY;
}

async function cnt(client, table, filter) {
  let q = client.from(table).select("id", { count: "exact", head: true });
  if (filter) q = filter(q);
  const { count, error } = await q;
  return error ? null : count || 0;
}

export async function GET(req) {
  if (!authorized(req)) return Response.json({ error: "인증 실패" }, { status: 401 });
  const client = sb();
  if (!client) return Response.json({ error: "Supabase 미설정" }, { status: 500 });

  const [
    leads,
    paid,
    reported,
    viewed,
    optin,
    mCreated,
    mBothYes,
    mBothPaid,
    mExchanged,
  ] = await Promise.all([
    cnt(client, "leads"),
    cnt(client, "leads", (q) => q.eq("paid", true)),
    cnt(client, "leads", (q) => q.not("report", "is", null)),
    cnt(client, "leads", (q) => q.not("viewed_at", "is", null)),
    cnt(client, "leads", (q) => q.eq("match_optin", true)),
    cnt(client, "matches"),
    cnt(client, "matches", (q) => q.eq("a_accept", true).eq("b_accept", true)),
    cnt(client, "matches", (q) => q.eq("a_paid", true).eq("b_paid", true)),
    cnt(client, "matches", (q) =>
      q.eq("a_paid", true).eq("b_paid", true).not("kakao_a", "is", null).not("kakao_b", "is", null)
    ),
  ]);

  return Response.json({
    funnel: [
      { id: "lead", label: "디비 제출 (lead_submitted)", n: leads },
      { id: "paid", label: "실결제 완료 (paid ✓)", n: paid },
      { id: "reported", label: "리포트 생성·전달", n: reported },
      { id: "viewed", label: "리포트 열람 (viewed_at)", n: viewed },
      { id: "optin", label: "紅線 매칭 신청", n: optin },
      { id: "m_created", label: "인연 카드 발송", n: mCreated, unit: "쌍" },
      { id: "m_both_yes", label: "양측 수락 (매칭 성사)", n: mBothYes, unit: "쌍" },
      { id: "m_both_paid", label: "양측 성사비 결제", n: mBothPaid, unit: "쌍" },
      { id: "m_exchanged", label: "연락처 상호 공개", n: mExchanged, unit: "쌍" },
    ],
  });
}
