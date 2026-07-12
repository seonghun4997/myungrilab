"use client";
// ============================================================
// v15.3 — 용용식 페이지 넘김 리포트 (인트로 → 序 → 장별 1페이지 → 맺음)
// 하단 네비: ← 이전 / 다음 장 제목 → · 목차 오버레이 · 페이지 표시
// ============================================================
import { useEffect, useMemo, useState } from "react";
import { CHAPTERS, PARTS } from "../../../lib/report";
import { ev } from "../../../lib/track";
import MatchCta from "./MatchCta";
import RateWidget from "./RateWidget";
import { Bars, Gauge, VsBar, FlowChart, PastTimeline, RarityCard, PersonCard, MonthsCard, CautionList, MyeongbanGrid } from "./widgets";
import { HeroArt, ChapterArt } from "./art";
import ShareCard from "./ShareCard";

function renderText(text) {
  return text.split(/\n{2,}/).map((para, i) => (
    <p key={i} style={{ fontSize: 15.5, marginBottom: 14, lineHeight: 1.9 }}>
      {para.split(/(\*\*[^*]+\*\*)/g).map((seg, j) =>
        seg.startsWith("**") && seg.endsWith("**") ? <b key={j} style={{ color: "var(--amethyst-hi)" }}>{seg.slice(2, -2)}</b> : <span key={j}>{seg}</span>
      )}
    </p>
  ));
}

// [[소제목]]/[[인용]] 마커 파싱 (마커 없으면 null → 통짜 렌더)
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
      case "gwiin_good":
        return <PersonCard key={wid} title={`날 도와줄 귀인 — 천이궁 ${scores.귀인카드.별.join("·") || "차성"}`} keywords={scores.귀인카드.키워드} />;
      case "gwiin_bad":
        return <PersonCard key={wid} title={`조심할 인연의 단서 — 노복궁 ${scores.악인단서.별.join("·") || "차성"}`} tone="red"
          keywords={["말이 앞섬", "감정 기복", "책임 회피", "경쟁 유발"]} />;
      case "gwiin":
        return (
          <div key={wid}>
            <PersonCard title={`날 도와줄 귀인 — 천이궁 ${scores.귀인카드.별.join("·") || "차성"}`} keywords={scores.귀인카드.키워드} />
            <PersonCard title={`조심할 인연의 단서 — 노복궁 ${scores.악인단서.별.join("·") || "차성"}`} tone="red"
              keywords={["말이 앞섬", "감정 기복", "책임 회피", "경쟁 유발"]} />
          </div>
        );
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

function ChapterBody({ ch, text, scores, z, gender, name, token }) {
  const parsed = parseChapter(text);
  const W = (ids, key) => <ChapterWidgets key={key} ids={ids} scores={scores} z={z} gender={gender} name={name} />;
  let content;
  if (!parsed) {
    content = (
      <>
        {renderText(text)}
        {W(ch.widget, "w-all")}
      </>
    );
  } else {
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
          <p className="display" style={{ fontSize: 16.5, lineHeight: 1.95, color: "var(--tx)", whiteSpace: "pre-line" }}>“{parsed.quote}”</p>
        </div>
      );
    }
    content = out;
  }
  return (
    <>
      {content}
      {ch.id === "ch08" && (
        <a href={`/m/${token}`} className="btn btn-seal" style={{ marginTop: 18, fontSize: 14.5 }}>
          紅線 매칭 — 이 상대, 월하노인이 찾아드려요
        </a>
      )}
    </>
  );
}

export default function ReportPager({ name, birth, token, chapters, scores, z }) {
  const [page, setPage] = useState(0);
  const [toc, setToc] = useState(false);

  const chList = useMemo(() => CHAPTERS.filter((c) => c.id !== "letter" && chapters[c.id]), [chapters]);
  const pages = useMemo(
    () => [{ t: "intro" }, { t: "seo" }, ...chList.map((ch) => ({ t: "ch", ch })), { t: "fin" }],
    [chList]
  );
  const total = pages.length;
  const cur = pages[page] || pages[0];

  useEffect(() => { ev("report_view"); }, []);
  useEffect(() => { try { window.scrollTo(0, 0); } catch (e) {} }, [page]);

  const go = (n) => setPage(Math.max(0, Math.min(total - 1, n)));

  const pageTitle = (p) => {
    if (!p) return "";
    if (p.t === "intro") return "리포트 표지";
    if (p.t === "seo") return "나의 자미두수 명반";
    if (p.t === "fin") return "월하노인의 편지";
    return p.ch.title;
  };
  const next = pages[page + 1];

  // ───── 표지 ─────
  if (cur.t === "intro") {
    return (
      <div style={{ textAlign: "center", padding: "10px 0 20px" }}>
        <HeroArt />
        <div className="eyebrow" style={{ marginBottom: 26 }}>紫微緣 · 자미두수 정밀 감정서</div>
        <p className="display" style={{ fontSize: 20, lineHeight: 2.05, color: "var(--tx)", marginBottom: 26 }}>
          “어서 오세요, {name}님.<br />{name}님의 자미두수 명반을 펼쳐<br />삶의 큰 흐름을 읽어드릴게요.”
        </p>
        <p className="display" style={{ fontSize: 16, lineHeight: 2, color: "var(--tx-dim)", marginBottom: 26 }}>
          “{birth.y}-{String(birth.m).padStart(2, "0")}-{String(birth.d).padStart(2, "0")}{birth.slot ? ` · ${birth.slot}` : ""} 기준으로<br />
          12궁 별자리의 배치를 살펴<br />앞으로의 운의 방향을 짚었어요.”
        </p>
        <p className="display" style={{ fontSize: 16, lineHeight: 2, color: "var(--tx-dim)", marginBottom: 36 }}>
          “이제 {name}님의 명반과<br />인생의 흐름을<br />차분히 안내해 드릴게요.”
        </p>
        <button className="btn" onClick={() => go(1)} style={{ cursor: "pointer" }}>자미두수 리포트 보기</button>
        <p className="mono" style={{ fontSize: 10.5, color: "var(--tx-dim)", marginTop: 14 }}>전체 {total}장 · 한 장씩 넘겨보세요</p>
      </div>
    );
  }

  return (
    <div>
      {/* 상단 바 — 현재 위치 + 목차 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "4px 0 14px" }}>
        <span className="mono" style={{ fontSize: 10.5, color: "var(--tx-dim)" }}>{page + 1} / {total}</span>
        <button onClick={() => setToc(true)}
          style={{ background: "transparent", border: "1px solid rgba(196,176,255,.35)", color: "var(--tx)", borderRadius: 10, padding: "6px 14px", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
          목차
        </button>
      </div>

      {/* 목차 오버레이 */}
      {toc && (
        <div onClick={() => setToc(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(8,6,20,.86)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} className="card" style={{ maxWidth: 420, width: "100%", maxHeight: "78vh", overflowY: "auto" }}>
            <div className="eyebrow" style={{ marginBottom: 14 }}>目次 · 감정서 차례</div>
            {pages.map((p, i) => {
              if (p.t === "intro") return null;
              const label = p.t === "ch" ? `${p.ch.no} · ${p.ch.title}` : p.t === "seo" ? "序 · 나의 자미두수 명반" : "맺음 · 월하노인의 편지";
              return (
                <button key={i} onClick={() => { go(i); setToc(false); }}
                  style={{ display: "block", width: "100%", textAlign: "left", background: "transparent", border: "none", cursor: "pointer",
                    padding: "10px 6px", fontSize: 14, fontFamily: "inherit",
                    color: i === page ? "var(--amethyst-hi)" : "var(--tx)", borderBottom: "1px solid rgba(196,176,255,.12)" }}>
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ───── 序 · 명반 ───── */}
      {cur.t === "seo" && (
        <div className="card">
          <ChapterArt theme="seo" />
          <div className="eyebrow" style={{ marginBottom: 8 }}>序 · 명반을 펼치며</div>
          <p style={{ fontSize: 14.5, color: "var(--tx-dim)", lineHeight: 1.85 }}>
            어서 오세요, {name}님. 자미두수는 태어난 순간의 하늘을 <b style={{ color: "var(--amethyst-hi)" }}>명반</b> 한 장에 펼쳐 읽는 학문입니다.
            열두 개의 방마다 별이 앉아 {name}님의 성정과 흐름을 말하고 있으니, 달 아래에서 하나씩 짚어드릴게요.
          </p>
          <MyeongbanGrid palaces={z.palaces} name={name} bureau={z.bureauName} sahwa={z.sahwa} sinPos={z.sin} />
          <ShareCard
            name={name}
            myeongStars={(z.palaces.find((pl) => pl.name === "명궁")?.majors || []).join("·")}
            bureau={z.bureauName}
            rarityPct={scores?.희소도?.pct ?? 10}
          />
        </div>
      )}

      {/* ───── 본문 장 ───── */}
      {cur.t === "ch" && (
        <div>
          <div style={{ textAlign: "center", margin: "6px 0 18px" }}>
            <div className="eyebrow">{PARTS[cur.ch.part]}</div>
          </div>
          <div className="card" id={cur.ch.id}>
            <div style={{ marginBottom: 12 }}>
              <div className="mono" style={{ fontSize: 10.5, letterSpacing: ".3em", color: "var(--amethyst-hi)", marginBottom: 4 }}>{cur.ch.no}</div>
              <h2 className="display" style={{ fontSize: 19, color: "var(--tx)" }}>{cur.ch.title}</h2>
            </div>
            <ChapterArt theme={cur.ch.id} />
            <ChapterBody ch={cur.ch} text={chapters[cur.ch.id]} scores={scores} z={z} gender={birth.gender} name={name} token={token} />
          </div>
        </div>
      )}

      {/* ───── 맺음 · 편지 + 별점 + 紅線 ───── */}
      {cur.t === "fin" && (
        <div>
          <div style={{ textAlign: "center", margin: "6px 0 18px" }}>
            <div className="eyebrow">{PARTS.fin}</div>
          </div>
          <div className="card" id="letter">
            <div style={{ marginBottom: 12 }}>
              <div className="mono" style={{ fontSize: 10.5, letterSpacing: ".3em", color: "var(--amethyst-hi)", marginBottom: 4 }}>맺음</div>
              <h2 className="display" style={{ fontSize: 19, color: "var(--tx)" }}>월하노인의 편지</h2>
            </div>
            <ChapterArt theme="letter" />
            {chapters.letter ? renderText(chapters.letter) : (
              <p style={{ fontSize: 14.5, color: "var(--tx-dim)" }}>여기까지 함께 읽어주셔서 고맙습니다. {name}님의 앞길에 달빛이 함께하기를.</p>
            )}
          </div>
          <RateWidget token={token} />
          <MatchCta token={token} />
        </div>
      )}

      {/* ───── 하단 네비게이션 ───── */}
      <div style={{ display: "flex", gap: 10, margin: "26px 0 6px" }}>
        <button onClick={() => go(page - 1)} className="btn btn-ghost"
          style={{ cursor: "pointer", flex: "0 0 34%", fontSize: 14 }}>
          ← 이전
        </button>
        {next ? (
          <button onClick={() => go(page + 1)} className="btn" style={{ cursor: "pointer", flex: 1, fontSize: 14.5 }}>
            {pageTitle(next)} →
          </button>
        ) : (
          <button onClick={() => go(0)} className="btn" style={{ cursor: "pointer", flex: 1, fontSize: 14.5 }}>
            처음으로
          </button>
        )}
      </div>
    </div>
  );
}
