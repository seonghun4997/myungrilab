// ============================================================
// /api/claim — 0원 쿠폰(FREE_COUPONS) 즉시 발급
// 쿠폰 코드가 서버에서 검증되면: paid 처리 → 감정서 생성 → token 반환
// 관리자 개입 없이 고객이 결제 페이지에서 바로 감정서를 받는다.
// ============================================================
export const maxDuration = 60;

import { sb } from "../../../lib/supabase";
import { CONFIG } from "../../../lib/content";
import { generateReportForLead } from "../../../lib/reportgen";

export async function POST(req) {
  try {
    const { leadId, coupon } = await req.json();
    const code = String(coupon || "").trim().toUpperCase();
    if (!leadId || !(CONFIG.FREE_COUPONS || []).includes(code)) {
      return Response.json({ error: "유효하지 않은 요청입니다." }, { status: 400 });
    }
    const client = sb();
    if (!client) return Response.json({ error: "Supabase가 설정되지 않았습니다." }, { status: 500 });

    const { data: lead, error } = await client.from("leads").select("*").eq("id", leadId).single();
    if (error || !lead) return Response.json({ error: "리드를 찾을 수 없습니다." }, { status: 404 });

    // 0원 결제 처리 기록 (쿠폰 코드를 리드에 남겨 깔때기에서 테스트 건 구분 가능)
    try { await client.from("leads").update({ paid: true, intro: lead.intro || `[쿠폰:${code}]` }).eq("id", lead.id); } catch (e) {}

    const { token, failed } = await generateReportForLead(client, { ...lead, paid: true });
    return Response.json({ token, failed });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "서버 오류: " + e.message }, { status: 500 });
  }
}
