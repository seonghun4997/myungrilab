// ============================================================
// /r/[token] — 감정서 열람 페이지 (v15: 序 + 13장 + 편지 + 위젯)
// 위젯 수치는 저장하지 않고 열람 시 명반에서 재계산 (결정론적)
// ============================================================
import { sb } from "../../../lib/supabase";
import { computeZiwei, BUREAU_NAME } from "../../../lib/ziwei";
import { buildScores } from "../../../lib/scores";
import { SECTIONS, EXTRA_SECTIONS, CHAPTERS, PARTS } from "../../../lib/report";
import { CONFIG } from "../../../lib/content";
import MatchCta from "./MatchCta";
import RateWidget from "./RateWidget";
import KLCmod from "korean-lunar-calendar";
import { Bars, Gauge, VsBar, FlowChart, PastTimeline, RarityCard, PersonCard, MonthsCard, CautionList, MyeongbanGrid } from "./widgets";

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

// v15.2 — [[소제목]]/[[인용]] 마커 파싱 (구버전 텍스트는 null 반환 → 기존 렌더)
function parseChapter(text) {
  if (!text || !text.includes("[[소제목]]")) return null;
  let quote = null;
  let body = text;
  const qi = text.indexOf("[[인용]]");
  if (qi >= 0) {
    quote = text.slice(qi + "[[인용]]".length).trim().replace(/^["“」』]+|["”「『]+$/g, "").trim();
    body = text.slice(0, qi);
  }
  const subs = body
    .split("[[소제목]]")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((chunk) => {
      const nl = chunk.indexOf("\n");
      if (nl < 0) return { title: chunk.trim(), body: "" };
      return { title: chunk.slice(0, nl).trim(), body: chunk.slice(nl + 1).trim() };
    })
    .filter((s) => s.title || s.body);
  if (!subs.length) return null;
  return { subs, quote };
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

// 장별 위젯 렌더
function ChapterWidgets({ ids, scores, z, gender, name }) {
  const nowYear = new Date().getFullYear();
  return ids.map((wid) => {
    switch (wid) {
      case "traits": return <Bars key={wid} data={scores.성향} />;
      case "needs": return <Bars key={wid} data={scores.욕구} />;
      case "past": {
        const birthYear = z.input.solarYear;
        const list = z.daehan.map((d) => ({ 구간: `${d.startAge}~${d.endAge}세`, 연도: `${birthYear + d.startAge - 1}`, 해당본명궁: d.palaceName }));
        return <PastTimeline key={wid} daehanList={list} nowYear={nowYear} />;
      }
      case "rarity": return <RarityCard key={wid} rarity={scores.희소도} />;
      case "flow": return <FlowChart key={wid} points={scores.운흐름} peak={scores.최고시점} />;
      case "wealth": return <Gauge key={wid} value={scores.부의그릇} label="타고난 부의 그릇" />;
      case "worktype": return <VsBar key={wid} a={scores.일유형.직장인} b={scores.일유형.사업가} aLabel="직장인 팔자" bLabel="사업가 팔자" />;
      case "spouse":
        return (
          <PersonCard key={wid} title={`운명의 상대 — 부처궁 ${scores.상대카드.별.join("·") || "차성"}`}
            keywords={scores.상대카드.키워드}
            desc={`${gender === "M" ? "여성" : "남성"} · ${name}님의 부처궁 별이 그리는 인상과 성정이에요.`} />
        );
      case "health": return <Bars key={wid} data={scores.건강} accent="#ff8b98" />;
      case "gwiin":
        return (
          <div key={wid}>
            <PersonCard title={`날 도와줄 귀인 — 천이궁 ${scores.귀인카드.별.join("·") || "차성"}`} keywords={scores.귀인카드.키워드} />
            <PersonCard title={`조심할 인연의 단서 — 노복궁 ${scores.악인단서.별.join("·") || "차성"}`} tone="red"
              keywords={["말이 앞섬", "감정 기복", "책임 회피", "경쟁 유발"]} />
          </div>
        );
      case "gwiin_good":
        return <PersonCard key={wid} title={`날 도와줄 귀인 — 천이궁 ${scores.귀인카드.별.join("·") || "차성"}`} keywords={scores.귀인카드.키워드} />;
      case "gwiin_bad":
        return <PersonCard key={wid} title={`조심할 인연의 단서 — 노복궁 ${scores.악인단서.별.join("·") || "차성"}`} tone="red"
          keywords={["말이 앞섬", "감정 기복", "책임 회피", "경쟁 유발"]} />;
      case "turning":
        return scores.다음대운시작 ? (
          <div key={wid} style={{ textAlign: "center", margin: "14px 0", padding: "16px 12px", borderRadius: 14, background: "rgba(255,212,121,.08)", border: "1px solid rgba(255,212,121,.3)" }}>
            <div className="eyebrow" style={{ color: "#ffd479" }}>인생이 크게 바뀌는 때</div>
            <div className="display" style={{ fontSize: 32, color: "#ffd479", margin: "4px 0" }}>{scores.다음대운시작}년</div>
            <div style={{ fontSize: 12.5, color: "var(--tx-dim)" }}>새로운 10년 대운이 열리는 해</div>
          </div>
        ) : null;
      case "caution": return <CautionList key={wid} years={scores.주의연도} />;
      case "months": return <MonthsCard key={wid} months={scores.유월} />;
      default: return null;
    }
  });
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

  return (
    <main className="wrap" style={{ paddingTop: 40, paddingBottom: 60 }}>
      <div style={{ textAlign: "center", marginBottom: 26 }}>
        <div className="eyebrow">{CONFIG.BRAND_HANJA} · 자미두수 정밀 감정서</div>
        <h1 className="display" style={{ fontSize: 27, margin: "14px 0 6px" }}>{lead.name} — 인연 감정서</h1>
        <p className="mono" style={{ fontSize: 12, color: "var(--tx-dim)" }}>
          {b.y}. {b.m}. {b.d}. {b.slot || ""} · {b.gender === "M" ? "남" : "여"}
        </p>
      </div>

      {/* ═══ v15 렌더 ═══ */}
      {isV15 && computed && (
        <>
          {/* 序 — 명반 펼치기 */}
          <div className="card">
            <div className="eyebrow" style={{ marginBottom: 8 }}>序 · 명반을 펼치며</div>
            <p style={{ fontSize: 14.5, color: "var(--tx-dim)", lineHeight: 1.85 }}>
              어서 오세요, {lead.name}님. 자미두수는 태어난 순간의 하늘을 <b style={{ color: "var(--amethyst-hi)" }}>명반</b> 한 장에 펼쳐 읽는 학문입니다.
              열두 개의 방마다 별이 앉아 {lead.name}님의 성정과 흐름을 말하고 있으니, 달 아래에서 하나씩 짚어드릴게요.
            </p>
            <MyeongbanGrid
              palaces={computed.z.palaces}
              name={lead.name}
              bureau={BUREAU_NAME[computed.z.bureau] || ""}
              sahwa={computed.z.sahwa}
              sinPos={computed.z.sin}
            />
          </div>

          {/* 본문 13장 + 편지 */}
          {(() => {
            let lastPart = null;
            return CHAPTERS.map((ch) => {
              const text = lead.report.chapters?.[ch.id];
              if (!text) return null;
              const partHeader = ch.part !== lastPart ? (lastPart = ch.part, (
                <div key={"part-" + ch.part} style={{ textAlign: "center", margin: "34px 0 18px" }}>
                  <div className="eyebrow">{PARTS[ch.part]}</div>
                  <hr className="divider" style={{ margin: "12px auto 0", maxWidth: 120 }} />
                </div>
              )) : null;
              return (
                <div key={ch.id}>
                  {partHeader}
                  <div className="card" id={ch.id}>
                    <div style={{ marginBottom: 12 }}>
                      <div className="mono" style={{ fontSize: 10.5, letterSpacing: ".3em", color: "var(--amethyst-hi)", marginBottom: 4 }}>{ch.no}</div>
                      <h2 className="display" style={{ fontSize: 19, color: "var(--tx)" }}>{ch.title}</h2>
                    </div>
                    {(() => {
                      const parsed = parseChapter(text);
                      const W = (ids, key) => (
                        <ChapterWidgets key={key} ids={ids} scores={computed.scores} z={computed.z} gender={b.gender} name={lead.name} />
                      );
                      if (!parsed) {
                        // 구형(마커 없는) 장 — 기존 방식 그대로
                        return (
                          <>
                            {renderText(text)}
                            {W(ch.widget, "w-all")}
                          </>
                        );
                      }
                      const wpos = ch.wpos || [];
                      const out = [];
                      parsed.subs.forEach((s, i) => {
                        if (s.title) {
                          out.push(
                            <h3 key={"t" + i} className="display" style={{ fontSize: 16.5, color: "var(--amethyst-hi)", margin: (i ? 30 : 6) + "px 0 12px" }}>
                              {s.title}
                            </h3>
                          );
                        }
                        if (s.body) out.push(<div key={"b" + i}>{renderText(s.body)}</div>);
                        ch.widget.forEach((wid, k) => {
                          if (wpos[k] === i + 1) out.push(W([wid], "w" + k));
                        });
                      });
                      const leftovers = ch.widget.filter((_, k) => !(wpos[k] >= 1 && wpos[k] <= parsed.subs.length));
                      if (leftovers.length) out.push(W(leftovers, "w-rest"));
                      if (parsed.quote) {
                        out.push(
                          <div key="q" style={{ textAlign: "center", margin: "30px 10px 8px" }}>
                            <hr className="divider" style={{ margin: "0 auto 18px", maxWidth: 80 }} />
                            <p className="display" style={{ fontSize: 16.5, lineHeight: 1.95, color: "var(--tx)", whiteSpace: "pre-line" }}>
                              “{parsed.quote}”
                            </p>
                          </div>
                        );
                      }
                      return out;
                    })()}
                    {ch.id === "ch08" && (
                      <a href={CONFIG.KAKAO_CHANNEL_URL} target="_blank" rel="noreferrer" className="btn btn-seal" style={{ marginTop: 4, fontSize: 14.5 }}>
                        紅線 — 이 상대를 자미두수 궁합으로 찾아드립니다
                      </a>
                    )}
                  </div>
                </div>
              );
            });
          })()}

          <RateWidget token={params.token} />
        </>
      )}

      {/* ═══ 구버전(v13 이하) 렌더 ═══ */}
      {!isV15 &&
        ALL_SECTIONS.map((s) => {
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
