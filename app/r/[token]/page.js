// ============================================================
// /r/[token] — 감정서 열람 페이지 (v15.3: 용용식 페이지 넘김)
// 서버: 리드 조회 + 명반 재계산 → 클라이언트 ReportPager로 전달
// 위젯 수치는 저장하지 않고 열람 시 명반에서 재계산 (결정론적)
// ============================================================
import { sb } from "../../../lib/supabase";
import { computeZiwei, BUREAU_NAME } from "../../../lib/ziwei";
import { buildScores } from "../../../lib/scores";
import { SECTIONS, EXTRA_SECTIONS } from "../../../lib/report";
import { CONFIG } from "../../../lib/content";
import MatchCta from "./MatchCta";
import ReportPager from "./ReportPager";
import KLCmod from "korean-lunar-calendar";

const ALL_SECTIONS = [...SECTIONS, ...EXTRA_SECTIONS[3].filter((e) => !SECTIONS.find((s) => s.id === e.id))];

export const dynamic = "force-dynamic";

function renderText(text) {
  return text.split(/\n{2,}/).map((para, i) => (
    <p key={i} style={{ fontSize: 15.5, marginBottom: 14, lineHeight: 1.9 }}>
      {para.split(/(\*\*[^*]+\*\*)/g).map((seg, j) =>
        seg.startsWith("**") && seg.endsWith("**") ? <b key={j} style={{ color: "var(--amethyst-hi)" }}>{seg.slice(2, -2)}</b> : <span key={j}>{seg}</span>
      )}
    </p>
  ));
}

function computeForLead(b) {
  try {
    const KLC = KLCmod.default || KLCmod;
    const c = new KLC();
    if (!c.setSolarDate(b.y, b.m, b.d)) return null;
    const lun = c.getLunarCalendar();
    const z = computeZiwei({
      lunarYear: lun.year, lunarMonth: lun.month, lunarDay: lun.day,
      hourBranch: b.slotIdx ?? 6, gender: b.gender,
      solarYear: b.y, solarMonth: b.m, solarDay: b.d,
    });
    return { z, scores: buildScores(z) };
  } catch (e) { return null; }
}

export default async function ReportPage({ params }) {
  const client = sb();
  let lead = null;
  if (client) {
    const { data } = await client.from("leads").select("id, name, birth, report, created_at, viewed_at").eq("token", params.token).single();
    lead = data;
    if (lead && lead.report && !lead.viewed_at) {
      try { await client.from("leads").update({ viewed_at: new Date().toISOString() }).eq("id", lead.id); } catch (e) {}
    }
  }

  if (!lead || !lead.report) {
    return (
      <main className="wrap" style={{ paddingTop: 80, textAlign: "center" }}>
        <div className="eyebrow">{CONFIG.BRAND_HANJA}</div>
        <h1 className="display" style={{ fontSize: 24, margin: "16px 0 10px", color: "var(--tx)" }}>감정서를 찾을 수 없습니다</h1>
        <p style={{ color: "var(--tx-dim)", fontSize: 14 }}>링크가 정확한지 확인해주세요. 문제가 계속되면 카카오톡 채널로 문의 바랍니다.</p>
      </main>
    );
  }

  const b = lead.birth || {};
  const isV15 = lead.report.__v === 15;
  const computed = isV15 ? computeForLead(b) : null;

  // 클라이언트로 넘길 명반 요약 (직렬화 가능한 값만)
  const zLite = computed
    ? JSON.parse(JSON.stringify({
        palaces: computed.z.palaces,
        sahwa: computed.z.sahwa,
        sin: computed.z.sin,
        daehan: computed.z.daehan,
        input: computed.z.input,
        bureauName: BUREAU_NAME[computed.z.bureau] || "",
      }))
    : null;
  const scoresLite = computed ? JSON.parse(JSON.stringify(computed.scores)) : null;

  return (
    <main className="wrap" style={{ paddingTop: 40, paddingBottom: 60 }}>
      <div style={{ textAlign: "center", marginBottom: 26 }}>
        <div className="eyebrow">{CONFIG.BRAND_HANJA} · 자미두수 정밀 감정서</div>
        <h1 className="display" style={{ fontSize: 27, margin: "14px 0 6px" }}>{lead.name} — 인연 감정서</h1>
        <p className="mono" style={{ fontSize: 12, color: "var(--tx-dim)" }}>
          {b.y}. {b.m}. {b.d}. {b.slot || ""} · {b.gender === "M" ? "남" : "여"}
        </p>
      </div>

      {/* ═══ v15 렌더 — 페이지 넘김 ═══ */}
      {isV15 && zLite && scoresLite && (
        <ReportPager
          name={lead.name}
          birth={b}
          token={params.token}
          chapters={lead.report.chapters || {}}
          scores={scoresLite}
          z={zLite}
          kakaoUrl={CONFIG.KAKAO_CHANNEL_URL}
        />
      )}

      {/* ═══ 구버전(v13 이하) 렌더 ═══ */}
      {!isV15 && (
        <>
          {ALL_SECTIONS.map((s) => {
            const text = lead.report[s.id];
            if (!text) return null;
            return (
              <div className="card" key={s.id} style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12 }}>
                  <span className="display" style={{ fontSize: 26, color: "var(--amethyst-hi)" }}>{s.hanja}</span>
                  <h2 className="display" style={{ fontSize: 18, color: "var(--tx)" }}>{s.title}</h2>
                </div>
                {renderText(text)}
              </div>
            );
          })}
          <MatchCta kakaoUrl={CONFIG.KAKAO_CHANNEL_URL} />
        </>
      )}

      <footer style={{ paddingTop: 30 }}>
        <p>
          본 리포트는 명리학 이론에 기반한 참고용 콘텐츠이며,<br />
          인생의 결정에 대한 유일한 근거가 될 수 없습니다.<br /><br />
          © {new Date().getFullYear()} {CONFIG.BRAND}
        </p>
      </footer>
    </main>
  );
}
