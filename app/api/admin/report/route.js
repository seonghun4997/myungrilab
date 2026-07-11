// ============================================================
// /api/admin/report — 리드 1건의 인연 감정서 생성 (ADMIN_KEY 필요)
// 흐름: 리드 조회 → 양력→음력 변환 → 명반 계산 → 6섹션 병렬 생성 → 저장
// ============================================================
export const maxDuration = 60;

import { sb } from "../../../../lib/supabase";
import { computeZiwei } from "../../../../lib/ziwei";
import { buildFacts, SECTIONS } from "../../../../lib/report";
import { generateSection } from "../../../../lib/generate";
import KLCmod from "korean-lunar-calendar";

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
    if (lead.report && lead.token) return Response.json({ token: lead.token, reused: true });

    const b = lead.birth;
    const KLC = KLCmod.default || KLCmod;
    const c = new KLC();
    if (!c.setSolarDate(b.y, b.m, b.d)) throw new Error("음력 변환 실패");
    const lun = c.getLunarCalendar();
    const z = computeZiwei({
      lunarYear: lun.year, lunarMonth: lun.month, lunarDay: lun.day,
      hourBranch: b.slotIdx ?? 6,
      gender: b.gender,
      solarYear: b.y, solarMonth: b.m, solarDay: b.d,
    });
    const facts = buildFacts(z);

    const results = await Promise.all(
      SECTIONS.map(async (s) => {
        try { return [s.id, await generateSection(facts, s.id)]; }
        catch (e) { return [s.id, null]; }
      })
    );
    const report = Object.fromEntries(results);
    const failed = results.filter(([, t]) => !t).map(([id]) => id);
    if (failed.length === SECTIONS.length) {
      return Response.json({ error: "감정서 생성에 모두 실패했습니다. API 키/크레딧을 확인하세요." }, { status: 502 });
    }

    const token = crypto.randomUUID().replace(/-/g, "").slice(0, 20);
    const { error: upErr } = await client.from("leads").update({ report, token }).eq("id", leadId);
    if (upErr) throw upErr;

    return Response.json({ token, failed });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "서버 오류: " + e.message }, { status: 500 });
  }
}
