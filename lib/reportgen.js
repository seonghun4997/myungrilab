// ============================================================
// 감정서 생성 파이프라인 — /api/admin/report 와 /api/claim 공용
// 리드 → 음력 변환 → 명반 → 티어별 장 병렬 생성 → 저장 → token
// ============================================================
import { computeZiwei } from "./ziwei";
import { buildFacts, TIER_CHAPTER_IDS } from "./report";
import { generateChapter } from "./generate";
import KLCmod from "korean-lunar-calendar";

export async function generateReportForLead(client, lead) {
  if (lead.report && lead.token) return { token: lead.token, reused: true, failed: [] };

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
  const facts = buildFacts(z, b.concern || null);
  const tier = lead.quiz_hits && [1, 2, 3].includes(lead.quiz_hits) ? lead.quiz_hits : 1;
  const chapterIds = TIER_CHAPTER_IDS[tier] || TIER_CHAPTER_IDS[1];

  const results = await Promise.all(
    chapterIds.map(async (id) => {
      try { return [id, await generateChapter(facts, id, lead.name)]; }
      catch (e) { return [id, null]; }
    })
  );
  const chapters = Object.fromEntries(results.filter(([, t]) => t));
  const report = { __v: 15, tier, chapters };
  const failed = results.filter(([, t]) => !t).map(([id]) => id);
  if (failed.length === chapterIds.length) {
    throw new Error("감정서 생성에 모두 실패했습니다. API 키/크레딧을 확인하세요.");
  }

  const token = crypto.randomUUID().replace(/-/g, "").slice(0, 20);
  const { error: upErr } = await client.from("leads").update({ report, token }).eq("id", lead.id);
  if (upErr) throw upErr;

  return { token, reused: false, failed };
}
