// ============================================================
// /api/admin/report — 리드 1건의 인연 감정서 생성 (ADMIN_KEY 필요)
// 실제 파이프라인은 lib/reportgen.js 공용 모듈 사용
// ============================================================
export const maxDuration = 300;

import { sb } from "../../../../lib/supabase";
import { generateReportForLead } from "../../../../lib/reportgen";
import { smsSafe, MSG } from "../../../../lib/sms";

export async function POST(req) {
  try {
    const key = req.headers.get("x-admin-key");
    if (!key || !process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY) {
      return Response.json({ error: "인증 실패" }, { status: 401 });
    }
    const { leadId } = await req.json();
    const client = sb();
    if (!client) return Response.json({ error: "Supabase가 설정되지 않았습니다." }, { status: 500 });

    const { data: lead, error } = await client.from("leads").select("*").eq("id", leadId).single();
    if (error || !lead) return Response.json({ error: "리드를 찾을 수 없습니다." }, { status: 404 });

    const { token, reused, failed } = await generateReportForLead(client, lead);
    if (!reused && token) {
      const origin = new URL(req.url).origin;
      await smsSafe(lead.phone, MSG.report(lead.name, origin, token)); // 자동 발송 (실패해도 무시)
    }
    return Response.json(reused ? { token, reused } : { token, failed });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "서버 오류: " + e.message }, { status: 500 });
  }
}
