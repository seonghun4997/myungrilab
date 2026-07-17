// ============================================================
// POST /api/my/code — 서고 입장 코드 발송
// body: { phone }
// 정책: 리드 존재 여부와 무관하게 동일 응답(번호 존재 노출 방지)
//       코드는 최신 리드의 otp jsonb에 저장 (5분 유효, 5회 제한)
// 필요 SQL: alter table leads add column if not exists otp jsonb;
// ============================================================
import { NextResponse } from "next/server";
import { sb } from "../../../../lib/supabase";
import { smsSafe, MSG } from "../../../../lib/sms";

export async function POST(req) {
  try {
    const { phone } = await req.json();
    const p = String(phone || "").replace(/[^0-9]/g, "");
    if (p.length < 10) return NextResponse.json({ ok: false, error: "전화번호를 확인해주세요." }, { status: 400 });

    const supa = sb();
    const { data: leads } = await supa
      .from("leads").select("id, otp").eq("phone", p)
      .order("created_at", { ascending: false }).limit(1);

    if (leads && leads.length) {
      const lead = leads[0];
      // 재발송 속도 제한: 40초
      const prev = lead.otp || {};
      if (prev.sentAt && Date.now() - prev.sentAt < 40 * 1000) {
        return NextResponse.json({ ok: true }); // 조용히 무시 (기존 코드 유효)
      }
      const code = String(Math.floor(100000 + Math.random() * 900000));
      await supa.from("leads").update({
        otp: { code, exp: Date.now() + 5 * 60 * 1000, tries: 0, sentAt: Date.now() },
      }).eq("id", lead.id);
      await smsSafe(p, MSG.otp(code));
    }
    // 리드가 없어도 동일 응답
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: "잠시 후 다시 시도해주세요." }, { status: 500 });
  }
}
