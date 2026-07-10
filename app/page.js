"use client";
import { useState, useMemo, useRef, useEffect } from "react";
import { computeSaju, GAN, GAN_HANJA, JI, JI_HANJA, GAN_ELEM, JI_ELEM, ELEM_NAME, ELEM_HANJA, REGIONS, JI_MAIN_GAN } from "../lib/engine";
import { iljuCharacter, bluntLine, buildQuiz, buildTeaser } from "../lib/insights";
import { SECTIONS, buildFacts } from "../lib/report";
import { CONFIG, TEASER } from "../lib/content";
import { track } from "@vercel/analytics";

const ELEM_COLOR = ["var(--elem-wood)", "var(--elem-fire)", "var(--elem-earth)", "var(--elem-metal)", "var(--elem-water)"];

function ev(name, data) {
  try { track(name, data || {}); } catch (e) {}
}

// ---------------- 메인 ----------------
export default function Home() {
  const [step, setStep] = useState("intro"); // intro → input → reveal → quiz → teaser
  const [saju, setSaju] = useState(null);
  const [quiz, setQuiz] = useState([]);
  const [answers, setAnswers] = useState({});
  const topRef = useRef(null);

  const goto = (s) => {
    setStep(s);
    ev("step_" + s);
    setTimeout(() => topRef.current?.scrollIntoView({ behavior: "smooth" }), 30);
  };

  const onComputed = (result) => {
    setSaju(result);
    setQuiz(buildQuiz(result));
    setAnswers({});
    goto("reveal");
  };

  return (
    <main>
      <div ref={topRef} />
      <Steps step={step} />
      <div className="wrap">
        {step === "intro" && <Intro onStart={() => goto("input")} />}
        {step === "input" && <InputForm onComputed={onComputed} />}
        {step === "reveal" && saju && <Reveal saju={saju} onNext={() => goto("quiz")} />}
        {step === "quiz" && saju && (
          <Quiz saju={saju} quiz={quiz} answers={answers} setAnswers={setAnswers} onNext={() => goto("teaser")} />
        )}
        {step === "teaser" && saju && <Teaser saju={saju} answers={answers} quiz={quiz} onRestart={() => goto("input")} onReport={() => goto("report")} />}
        {step === "report" && saju && <Report saju={saju} onRestart={() => goto("input")} />}
        <Footer />
      </div>
    </main>
  );
}

function Steps({ step }) {
  const map = { intro: 0, input: 0, reveal: 1, quiz: 2, teaser: 3, report: 3 };
  const idx = map[step] ?? 0;
  const labels = ["計 계산", "命 명식", "驗 검증", "開 개봉"];
  return (
    <div className="steps">
      {labels.map((l, i) => (
        <span key={l} className={i === idx ? "on" : ""}>{l}</span>
      ))}
    </div>
  );
}

// ---------------- 0. 인트로 ----------------
function Intro({ onStart }) {
  return (
    <section className="fade-up" style={{ padding: "48px 0 30px", textAlign: "center" }}>
      <div className="eyebrow">{CONFIG.BRAND_HANJA}</div>
      <h1 className="display" style={{ fontSize: 44, lineHeight: 1.3, margin: "18px 0 10px" }}>
        믿지 마세요,<br />
        <span style={{ color: "var(--seal)" }}>검증</span>하세요.
      </h1>
      <p style={{ color: "var(--ink-soft)", fontSize: 16, maxWidth: 400, margin: "0 auto 8px" }}>
        긴 설명은 하지 않겠습니다. 3초 만에 당신의 사주 원국을 계산해 보여드리고,
        <b style={{ color: "var(--ink)" }}> 당신이 이미 살아온 과거</b>로 정확도를 직접 확인시켜 드리겠습니다.
      </p>
      <p className="mono" style={{ fontSize: 12, color: "var(--ink-soft)", margin: "18px 0 26px", letterSpacing: "0.06em" }}>
        천문 계산 절기 시각(분 단위) · 출생지 경도 보정 · 서머타임 반영
      </p>
      <button className="btn btn-seal" style={{ maxWidth: 340 }} onClick={() => { ev("cta_start"); onStart(); }}>
        내 사주 계산하기 — 무료
      </button>
      <p style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 12 }}>회원가입 없음 · 생년월일시만 필요합니다</p>
    </section>
  );
}

// ---------------- 1. 입력 ----------------
function InputForm({ onComputed }) {
  const now = new Date();
  const [cal, setCal] = useState("solar"); // solar | lunar
  const [leap, setLeap] = useState(false);
  const [y, setY] = useState(1995);
  const [m, setM] = useState(1);
  const [d, setD] = useState(1);
  const [unknownTime, setUnknownTime] = useState(false);
  const [hour, setHour] = useState(12);
  const [minute, setMinute] = useState(0);
  const [gender, setGender] = useState("F");
  const [region, setRegion] = useState("서울");
  const [err, setErr] = useState("");

  const years = [];
  for (let i = now.getFullYear(); i >= 1920; i--) years.push(i);

  const submit = async () => {
    setErr("");
    let sy = y, sm = m, sd = d;
    if (cal === "lunar") {
      try {
        const mod = await import("korean-lunar-calendar");
        const KLC = mod.default || mod;
        const c = new KLC();
        const ok = c.setLunarDate(y, m, d, leap);
        if (!ok) throw new Error("bad date");
        const s = c.getSolarCalendar();
        sy = s.year; sm = s.month; sd = s.day;
      } catch (e) {
        setErr("음력 날짜를 변환할 수 없습니다. 날짜를 다시 확인해주세요.");
        return;
      }
    }
    const daysIn = new Date(sy, sm, 0).getDate();
    if (sd > daysIn) { setErr("존재하지 않는 날짜입니다."); return; }
    const lon = REGIONS.find((r) => r.name === region)?.lon ?? null;
    const result = computeSaju({
      y: sy, m: sm, d: sd,
      hour: unknownTime ? null : hour,
      minute: unknownTime ? 0 : minute,
      gender, lon,
    });
    ev("input_submitted", { cal, unknownTime });
    onComputed(result);
  };

  const selStyle = {};
  return (
    <section className="fade-up" style={{ padding: "10px 0 40px" }}>
      <h2 className="display" style={{ fontSize: 26, marginBottom: 4 }}>생년월일시를 입력하세요</h2>
      <p style={{ fontSize: 14, color: "var(--ink-soft)", marginBottom: 22 }}>
        입력하는 순간, 표준 만세력 기준의 원국이 계산됩니다.
      </p>

      <div className="toggle-row" style={{ marginBottom: 16 }}>
        <button className={cal === "solar" ? "on" : ""} onClick={() => setCal("solar")}>양력</button>
        <button className={cal === "lunar" ? "on" : ""} onClick={() => setCal("lunar")}>음력</button>
      </div>
      {cal === "lunar" && (
        <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14, marginBottom: 16 }}>
          <input type="checkbox" style={{ width: "auto" }} checked={leap} onChange={(e) => setLeap(e.target.checked)} />
          윤달입니다
        </label>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
        <div className="field"><label>년</label>
          <select value={y} onChange={(e) => setY(+e.target.value)} style={selStyle}>
            {years.map((v) => <option key={v} value={v}>{v}년</option>)}
          </select>
        </div>
        <div className="field"><label>월</label>
          <select value={m} onChange={(e) => setM(+e.target.value)}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((v) => <option key={v} value={v}>{v}월</option>)}
          </select>
        </div>
        <div className="field"><label>일</label>
          <select value={d} onChange={(e) => setD(+e.target.value)}>
            {Array.from({ length: 31 }, (_, i) => i + 1).map((v) => <option key={v} value={v}>{v}일</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 8, opacity: unknownTime ? 0.4 : 1 }}>
        <div className="field"><label>시</label>
          <select value={hour} disabled={unknownTime} onChange={(e) => setHour(+e.target.value)}>
            {Array.from({ length: 24 }, (_, i) => i).map((v) => <option key={v} value={v}>{String(v).padStart(2, "0")}시</option>)}
          </select>
        </div>
        <div className="field"><label>분</label>
          <select value={minute} disabled={unknownTime} onChange={(e) => setMinute(+e.target.value)}>
            {[0, 10, 20, 30, 40, 50].map((v) => <option key={v} value={v}>{String(v).padStart(2, "0")}분</option>)}
          </select>
        </div>
      </div>
      <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14, marginBottom: 16 }}>
        <input type="checkbox" style={{ width: "auto" }} checked={unknownTime} onChange={(e) => setUnknownTime(e.target.checked)} />
        태어난 시간을 모릅니다
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
        <div className="field"><label>성별</label>
          <select value={gender} onChange={(e) => setGender(e.target.value)}>
            <option value="F">여성</option>
            <option value="M">남성</option>
          </select>
        </div>
        <div className="field"><label>출생 지역</label>
          <select value={region} onChange={(e) => setRegion(e.target.value)}>
            {REGIONS.map((r) => <option key={r.name} value={r.name}>{r.name}</option>)}
          </select>
        </div>
      </div>

      {err && <p style={{ color: "var(--seal)", fontSize: 14, marginBottom: 12 }}>{err}</p>}
      <button className="btn btn-seal" onClick={submit}>원국 계산하기</button>
      <p style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 12, textAlign: "center" }}>
        입력한 정보는 계산에만 사용되며 서버에 저장되지 않습니다.
      </p>
    </section>
  );
}

// ---------------- 2. 명식 공개 ----------------
function Reveal({ saju, onNext }) {
  const ch = useMemo(() => iljuCharacter(saju), [saju]);
  const blunt = useMemo(() => bluntLine(saju), [saju]);
  const total = saju.elemCount.reduce((a, b) => a + b, 0);
  const order = ["hour", "day", "month", "year"]; // 관례상 우측이 년주 → 좌→우: 시일월년
  const label = { hour: "시주 時", day: "일주 日", month: "월주 月", year: "년주 年" };

  return (
    <section className="fade-up" style={{ padding: "6px 0 40px" }}>
      <div className="eyebrow" style={{ textAlign: "center" }}>당신의 원국</div>
      <h2 className="display" style={{ fontSize: 24, textAlign: "center", margin: "10px 0 22px" }}>
        {saju.input.dateStr} {saju.input.hour != null ? `${String(saju.input.hour).padStart(2, "0")}:${String(saju.input.minute).padStart(2, "0")}` : "(시간 미상)"} 출생
      </h2>

      <div className="pillar-grid" style={{ marginBottom: 10 }}>
        {order.map((k, i) => {
          const p = saju.pillars[k];
          return (
            <div className="pillar" key={k}>
              <div className="p-label">{label[k]}</div>
              {p ? (
                <>
                  <div className={"seal-block" + (k === "day" ? " seal-day" : "")} style={{ animationDelay: `${i * 0.18}s` }}>
                    <span className="hanja" style={{ color: ELEM_COLOR[GAN_ELEM[p.gan]] }}>{GAN_HANJA[p.gan]}</span>
                    <span className="hangul">{GAN[p.gan]}</span>
                    <span className="ss">{k === "day" ? "나" : saju.sipseongOfGan(p.gan)}</span>
                  </div>
                  <div className={"seal-block" + (k === "day" ? " seal-day" : "")} style={{ animationDelay: `${i * 0.18 + 0.09}s` }}>
                    <span className="hanja" style={{ color: ELEM_COLOR[JI_ELEM[p.ji]] }}>{JI_HANJA[p.ji]}</span>
                    <span className="hangul">{JI[p.ji]}</span>
                    <span className="ss">{saju.sipseongOfJi(p.ji)}</span>
                  </div>
                </>
              ) : (
                <div style={{ border: "1.5px dashed #c9c0ab", padding: "34px 4px", color: "#b3a98f", fontSize: 12 }}>시간<br />미상</div>
              )}
            </div>
          );
        })}
      </div>
      <p className="mono" style={{ fontSize: 11, color: "var(--ink-soft)", textAlign: "center", marginBottom: 26 }}>
        {saju.corr.notes.join(" · ")} 적용됨
      </p>

      {/* 오행 분포 */}
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="eyebrow" style={{ marginBottom: 12 }}>오행 분포</div>
        {saju.elemCount.map((c, i) => (
          <div className="elem-row" key={i}>
            <span className="e-name">{ELEM_NAME[i]} {ELEM_HANJA[i]}</span>
            <div className="elem-bar-bg">
              <div className="elem-bar" style={{ width: `${(c / total) * 100}%`, background: ELEM_COLOR[i] }} />
            </div>
            <span className="e-count">{c}</span>
          </div>
        ))}
        <p style={{ fontSize: 13.5, color: "var(--ink-soft)", marginTop: 12 }}>
          일간 <b style={{ color: "var(--ink)" }}>{GAN[saju.pillars.day.gan]}{ELEM_HANJA[saju.myElem]}</b> ·
          {saju.strong ? " 신강한 구조 — 스스로 끌고 가는 힘이 강한 사주입니다." : " 신약한 구조 — 환경과 사람의 도움이 중요한 사주입니다."}
        </p>
      </div>

      {/* 일주 캐릭터 */}
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="eyebrow" style={{ marginBottom: 8 }}>{ch.ganzi}</div>
        <h3 className="display" style={{ fontSize: 24, lineHeight: 1.4, marginBottom: 12 }}>“{ch.name}”</h3>
        <p style={{ fontSize: 15.5 }}>{ch.text}</p>
        {ch.badges.length > 0 && (
          <p className="mono" style={{ fontSize: 12, color: "var(--seal)", marginTop: 14, lineHeight: 2 }}>
            {ch.badges.map((b) => `◉ ${b}`).join("  ")}
          </p>
        )}
      </div>

      {/* 직언 */}
      <div className="card" style={{ borderLeft: "4px solid var(--seal)", marginBottom: 28 }}>
        <div className="eyebrow" style={{ marginBottom: 10 }}>좋은 말은 생략합니다</div>
        {blunt.map((line, i) => (
          <p key={i} style={{ fontSize: 15.5, marginBottom: i < blunt.length - 1 ? 12 : 0 }}>{line}</p>
        ))}
      </div>

      <p style={{ textAlign: "center", fontSize: 15, marginBottom: 14 }}>
        여기까지는 누구나 하는 이야기라고요?<br />
        <b>그럼 지금부터, 당신의 과거를 맞혀보겠습니다.</b>
      </p>
      <button className="btn" onClick={() => { ev("cta_quiz"); onNext(); }}>
        과거 검증 시작 — 5문항
      </button>
    </section>
  );
}

// ---------------- 3. 과거 검증 ----------------
function Quiz({ saju, quiz, answers, setAnswers, onNext }) {
  const answered = Object.keys(answers).length;
  const done = answered >= quiz.length && quiz.length > 0;
  const hits = quiz.filter((q, i) => answers[i] === true).length;

  return (
    <section className="fade-up" style={{ padding: "6px 0 40px" }}>
      <div className="eyebrow" style={{ textAlign: "center" }}>과거 검증</div>
      <h2 className="display" style={{ fontSize: 24, textAlign: "center", margin: "10px 0 6px" }}>
        당신의 대운과 세운이<br />말하는 지난 시간들
      </h2>
      <p style={{ textAlign: "center", fontSize: 14, color: "var(--ink-soft)", marginBottom: 24 }}>
        아래는 광고 문구가 아니라, 당신의 명식에서 계산된 진술입니다.<br />솔직하게 답해주세요.
      </p>

      {quiz.map((q, i) => (
        <div className="card quiz-card" key={i} style={{ marginBottom: 14 }}>
          {answers[i] === true && <div className="stamp-hit">적중</div>}
          <div className="quiz-num">問 {i + 1} / {quiz.length}{q.year ? ` · ${q.year}년` : ""}</div>
          <p className="quiz-text">{q.text}</p>
          <div className="quiz-btns">
            <button
              className={answers[i] === true ? "picked-yes" : ""}
              onClick={() => { setAnswers({ ...answers, [i]: true }); ev("quiz_answer", { i, hit: true }); }}
            >그렇다</button>
            <button
              className={answers[i] === false ? "picked-no" : ""}
              onClick={() => { setAnswers({ ...answers, [i]: false }); ev("quiz_answer", { i, hit: false }); }}
            >아니다</button>
          </div>
        </div>
      ))}

      {done && (
        <div className="fade-up" style={{ textAlign: "center", marginTop: 26 }}>
          <p className="display" style={{ fontSize: 30, marginBottom: 6 }}>
            {quiz.length}문항 중 <span style={{ color: "var(--seal)" }}>{hits}개 적중</span>
          </p>
          <p style={{ fontSize: 14.5, color: "var(--ink-soft)", marginBottom: 20 }}>
            {hits >= 4 && "당신의 과거가 이미 증명했습니다. 이 명식은 당신의 이야기가 맞습니다."}
            {hits === 3 && "절반 이상이 일치합니다. 이 명식은 당신의 흐름을 읽고 있습니다."}
            {hits <= 2 && "일치율이 낮게 나왔습니다. 출생 시간이 부정확하거나 절입일 경계 출생일 가능성이 있습니다 — 정식 풀이에서는 시간 보정 진단을 함께 제공합니다."}
          </p>
          <button className="btn btn-seal" onClick={() => { ev("cta_teaser", { hits }); onNext(); }}>
            그럼, 앞으로의 5년은? →
          </button>
        </div>
      )}
    </section>
  );
}

// ---------------- 4. 미래 티저 (잠금) ----------------
function Teaser({ saju, answers, quiz, onRestart, onReport }) {
  const t = useMemo(() => buildTeaser(saju), [saju]);
  const hits = quiz.filter((q, i) => answers[i] === true).length;
  const firstRisk = t.risks[0]?.year;
  const firstOpp = t.opps[0]?.year;

  return (
    <section className="fade-up" style={{ padding: "6px 0 40px" }}>
      <div className="eyebrow" style={{ textAlign: "center" }}>개봉 전</div>
      <h2 className="display" style={{ fontSize: 25, textAlign: "center", margin: "10px 0 8px" }}>
        향후 5년, 당신의 명식에서<br />
        <span style={{ color: "var(--seal)" }}>위험 신호 {t.risks.length}개</span>와{" "}
        <span style={{ color: "var(--elem-wood)" }}>기회의 문 {t.opps.length}개</span>가<br />계산되었습니다
      </h2>
      <p style={{ textAlign: "center", fontSize: 14, color: "var(--ink-soft)", marginBottom: 24 }}>
        {hits >= 3
          ? `과거 ${hits}개를 맞힌 그 계산이, 앞으로의 시간에도 똑같이 적용됩니다.`
          : "과거를 계산한 것과 같은 방식으로, 미래의 흐름이 계산됩니다."}
      </p>

      {firstRisk && (
        <div className="card locked" style={{ marginBottom: 14 }}>
          <div className="lock-blur">
            <div className="eyebrow" style={{ marginBottom: 8 }}>{TEASER.riskTitle} 1</div>
            <p className="quiz-text">{firstRisk}년 ○○월부터 ○○의 축이 흔들립니다. 특히 ○○○과의 관계에서 ○○○○를 조심해야 하며, 이 시기의 결정은 ○○○○...</p>
          </div>
          <div className="lock-overlay">
            <span className="lock-ico">🔒</span>
            <span className="display" style={{ fontSize: 20 }}>{firstRisk}년 — {t.risks[0].kind}</span>
            <span className="lock-txt">{TEASER.lockNote}</span>
          </div>
        </div>
      )}
      {firstOpp && (
        <div className="card locked" style={{ marginBottom: 14 }}>
          <div className="lock-blur">
            <div className="eyebrow" style={{ marginBottom: 8 }}>{TEASER.oppTitle} 1</div>
            <p className="quiz-text">{firstOpp}년, 당신의 ○○운이 크게 열립니다. 이 해에 ○○○을 준비한 사람과 아닌 사람의 격차는 ○○○○...</p>
          </div>
          <div className="lock-overlay">
            <span className="lock-ico">🔒</span>
            <span className="display" style={{ fontSize: 20 }}>{firstOpp}년 — {t.opps[0].kind}</span>
            <span className="lock-txt">{TEASER.lockNote}</span>
          </div>
        </div>
      )}
      {t.nextDaeun && (
        <div className="card locked" style={{ marginBottom: 26 }}>
          <div className="lock-blur">
            <p className="quiz-text">{t.nextDaeun.startYear}년, 10년짜리 새 대운이 시작됩니다. 이 대운의 이름은 ○○이며, 당신의 인생 2막은...</p>
          </div>
          <div className="lock-overlay">
            <span className="lock-ico">🔒</span>
            <span className="display" style={{ fontSize: 20 }}>{t.nextDaeun.startYear}년 — 새 대운의 시작</span>
            <span className="lock-txt">{TEASER.lockNote}</span>
          </div>
        </div>
      )}

      <div style={{ textAlign: "center" }}>
        <p style={{ fontSize: 15, marginBottom: 16 }}>
          지금은 베타 기간입니다.<br />
          <b>잠긴 풀이 전체를 무료로 열어드립니다 — 대신 끝까지 읽고 판단해주세요.</b>
        </p>
        <button className="btn btn-seal" onClick={() => { ev("cta_report", { hits }); onReport(); }}>
          정식 풀이 전체 열람 — 베타 무료
        </button>
        <p style={{ fontSize: 12.5, color: "var(--ink-soft)", margin: "10px 0 20px" }}>6개 섹션 · 생성에 30초 정도 걸립니다</p>
        <a
          className="btn btn-ghost"
          href={CONFIG.CTA_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => ev("cta_signup", { hits })}
          style={{ marginBottom: 12 }}
        >
          {CONFIG.CTA_LABEL}
        </a>
        <button className="btn btn-ghost" onClick={onRestart}>다른 사람 사주 계산해보기</button>
      </div>
    </section>
  );
}

// ---------------- 5. 정식 풀이 리포트 (베타) ----------------
function Report({ saju, onRestart }) {
  const facts = useMemo(() => buildFacts(saju), [saju]);
  const [results, setResults] = useState({}); // id → { text } | { error }
  const startedRef = useRef(false);

  const fetchSection = async (id) => {
    setResults((r) => ({ ...r, [id]: { loading: true } }));
    try {
      const res = await fetch("/api/section", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sectionId: id, facts }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "생성 실패");
      setResults((r) => ({ ...r, [id]: { text: data.text } }));
      ev("report_section_done", { id });
    } catch (e) {
      setResults((r) => ({ ...r, [id]: { error: e.message } }));
      ev("report_section_error", { id });
    }
  };

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    ev("report_start");
    SECTIONS.forEach((s) => fetchSection(s.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doneCount = SECTIONS.filter((s) => results[s.id]?.text).length;
  const allDone = doneCount === SECTIONS.length;
  useEffect(() => {
    if (allDone) ev("report_complete");
  }, [allDone]);

  const ch = useMemo(() => iljuCharacter(saju), [saju]);

  // **굵게** 만 허용된 텍스트 렌더링
  const renderText = (text) =>
    text.split(/\n{2,}/).map((para, i) => (
      <p key={i} style={{ fontSize: 15.5, marginBottom: 14 }}>
        {para.split(/(\*\*[^*]+\*\*)/g).map((seg, j) =>
          seg.startsWith("**") && seg.endsWith("**") ? <b key={j}>{seg.slice(2, -2)}</b> : <span key={j}>{seg}</span>
        )}
      </p>
    ));

  return (
    <section className="fade-up" style={{ padding: "6px 0 40px" }}>
      <div className="eyebrow" style={{ textAlign: "center" }}>정식 풀이 · 베타</div>
      <h2 className="display" style={{ fontSize: 25, textAlign: "center", margin: "10px 0 6px" }}>
        {ch.ganzi} — “{ch.name}”
      </h2>
      <p className="mono" style={{ textAlign: "center", fontSize: 12, color: "var(--ink-soft)", marginBottom: 24 }}>
        {allDone ? `${SECTIONS.length}개 섹션 풀이 완료` : `풀이 생성 중… ${doneCount} / ${SECTIONS.length}`}
      </p>

      {SECTIONS.map((s) => {
        const r = results[s.id] || {};
        return (
          <div className="card" key={s.id} style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12 }}>
              <span className="display" style={{ fontSize: 26, color: "var(--seal)" }}>{s.hanja}</span>
              <h3 className="display" style={{ fontSize: 18 }}>{s.title}</h3>
            </div>
            {r.text && renderText(r.text)}
            {r.loading && (
              <p className="mono" style={{ fontSize: 13, color: "var(--ink-soft)" }}>
                <span className="ink-dot" /> 명식을 읽는 중입니다…
              </p>
            )}
            {r.error && (
              <div>
                <p style={{ fontSize: 14, color: "var(--seal)", marginBottom: 10 }}>{r.error}</p>
                <button className="btn btn-ghost" style={{ padding: "10px" }} onClick={() => fetchSection(s.id)}>다시 시도</button>
              </div>
            )}
          </div>
        );
      })}

      {allDone && (
        <div className="fade-up" style={{ textAlign: "center", marginTop: 28 }}>
          <hr className="divider" />
          <p style={{ fontSize: 15, marginBottom: 16 }}>
            여기까지가 베타 풀이의 전부입니다.<br />
            <b>읽어보니 어떠셨나요? 정식 출시 소식을 가장 먼저 받아보세요.</b>
          </p>
          <a
            className="btn btn-seal"
            href={CONFIG.CTA_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => ev("cta_signup_after_report")}
          >
            {CONFIG.CTA_LABEL}
          </a>
          <p style={{ fontSize: 12.5, color: "var(--ink-soft)", margin: "10px 0 20px" }}>{CONFIG.CTA_SUB}</p>
          <button className="btn btn-ghost" onClick={onRestart}>다른 사람 사주 계산해보기</button>
        </div>
      )}
    </section>
  );
}

// ---------------- 푸터 ----------------
function Footer() {
  return (
    <footer>
      <hr className="divider" />
      <div className="method" style={{ textAlign: "left", maxWidth: 460, margin: "0 auto 24px" }}>
        <b>계산 방식 공개</b><br />
        · 절기 입절 시각: 천문 계산 기반, 분 단위 판정 (1900–2051)<br />
        · 시간 보정: 출생지 경도 기준 평균태양시 / 표준자오선 이력 반영<br />
        · 서머타임: 국내 시행 기간(1948–60, 1987–88) 반영<br />
        · 일진: 율리우스일 기반 — 공인 만세력 대비 200/200 검증<br />
        · 자시 정책: 보정시 23시 이후 출생은 익일 일주로 계산
      </div>
      <p>
        본 서비스의 결과는 명리학 이론에 기반한 참고용 콘텐츠이며,<br />
        의학적·법률적·투자 판단의 근거가 될 수 없습니다.<br /><br />
        © {new Date().getFullYear()} {CONFIG.BRAND}
      </p>
    </footer>
  );
}
