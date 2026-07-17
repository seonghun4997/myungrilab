// ============================================================
// 감정서 생성 파이프라인 — /api/admin/report 와 /api/claim 공용
// 리드 → 음력 변환 → 명반 → 티어별 장 병렬 생성 → 저장 → token
// v15.1: 요청 시차 발사(속도 제한 회피) + 실패 원인 표면화
// ============================================================
import { computeZiwei } from "./ziwei";
import { buildFacts, TIER_CHAPTER_IDS } from "./report";
import { generateChapter } from "./generate";
import KLCmod from "korean-lunar-calendar";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
  const facts = buildFacts(z, b.concern || null, b.loveStatus || null);
  const tier = lead.quiz_hits && [1, 2, 3].includes(lead.quiz_hits) ? lead.quiz_hits : 1;
  const chapterIds = TIER_CHAPTER_IDS[tier] || TIER_CHAPTER_IDS[1];

  // 병렬 생성하되 시작을 600ms씩 어긋나게 — 분당 토큰 제한(429) 폭주 방지.
  // 개별 실패 원인은 errors에 모아 전체 실패 시 첫 원인을 그대로 노출한다.
  const errors = [];
  const results = await Promise.all(
    chapterIds.map(async (id, i) => {
      await sleep(i * 600);
      try { return [id, await generateChapter(facts, id, lead.name)]; }
      catch (e) { errors.push(`${id} → ${e.message}`); return [id, null]; }
    })
  );
  const chapters = Object.fromEntries(results.filter(([, t]) => t));
  const report = { __v: 15, tier, chapters };
  const failed = results.filter(([, t]) => !t).map(([id]) => id);
  if (failed.length === chapterIds.length) {
    console.error("[reportgen] 전체 실패:", errors);
    throw new Error(`감정서 생성에 모두 실패했습니다. 첫 실패 원인 — ${errors[0] || "알 수 없음"}`);
  }
  if (failed.length) console.warn("[reportgen] 일부 장 실패:", errors);

  const token = lead.token || crypto.randomUUID().replace(/-/g, "").slice(0, 20); // 기존 링크 유지
  const { error: upErr } = await client.from("leads").update({ report, token }).eq("id", lead.id);
  if (upErr) throw upErr;

  return { token, reused: false, failed };
}
