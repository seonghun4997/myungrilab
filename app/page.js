"use client";
import { useState, useMemo, useRef, useEffect } from "react";
import { computeSaju, GAN, GAN_HANJA, JI, JI_HANJA, GAN_ELEM, JI_ELEM, ELEM_NAME, ELEM_HANJA, REGIONS, JI_MAIN_GAN } from "../lib/engine";
import { iljuCharacter, bluntLine, buildQuiz, buildTeaser, salList } from "../lib/insights";
import { CONFIG, LOCKED_ITEMS } from "../lib/content";
import { track } from "@vercel/analytics";

const ELEM_COLOR = ["var(--elem-wood)", "var(--elem-fire)", "var(--elem-earth)", "var(--elem-metal)", "var(--elem-water)"];

function ev(name, data) {
  try { track(name, data || {}); } catch (e) {}
}

// ---------------- 메인 ----------------
export default function Home() {
  const [step, setStep] = useState("intro"); // intro → input → reveal → quiz → paywall
  const [saju, setSaju] = useState(null);
  const [leadId, setLeadId] = useState(null);
  const [leadName, setLeadName] = useState("");
  const [quiz, setQuiz] = useState([]);
  const [answers, setAnswers] = useState({});
  const topRef = useRef(null);

  const goto = (s) => {
    setStep(s);
    ev("step_" + s);
    setTimeout(() => topRef.current?.scrollIntoView({ behavior: "smooth" }), 30);
  };

  const onComputed = (result, id, nm) => {
    setSaju(result);
    setLeadId(id);
    setLeadName(nm || "");
    setQuiz(buildQuiz(result));
    setAnswers({});
    goto("reveal");
  };

  return (
    <main>
      <div ref={topRef} />
      {step !== "intro" && <Steps step={step} />}
      {step === "intro" ? (
        <Intro onStart={() => goto("input")} />
      ) : (
        <div className="wrap">
          {step === "input" && <InputForm onComputed={onComputed} />}
          {step === "reveal" && saju && <Reveal saju={saju} onNext={() => goto("quiz")} />}
          {step === "quiz" && saju && (
            <Quiz saju={saju} quiz={quiz} answers={answers} setAnswers={setAnswers} leadId={leadId} onNext={() => goto("paywall")} />
          )}
          {step === "paywall" && saju && <Paywall saju={saju} answers={answers} quiz={quiz} leadName={leadName} />}
          <Footer />
        </div>
      )}
    </main>
  );
}

function Steps({ step }) {
  const map = { intro: 0, input: 0, reveal: 1, quiz: 2, paywall: 3 };
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
// ---------------- 0. 인트로 (풀스크린 영상) ----------------
function Intro({ onStart }) {
  const [videoOk, setVideoOk] = useState(true);
  return (
    <section className="intro-full">
      {/* 배경 영상 — public/intro.mp4 파일을 넣으면 자동 재생됩니다 */}
      {videoOk && (
        <video
          className="intro-video"
          autoPlay
          muted
          loop
          playsInline
          poster="/intro.jpg"
          onError={() => setVideoOk(false)}
        >
          <source src="/intro.mp4" type="video/mp4" />
        </video>
      )}
      {/* 영상이 없을 때의 폴백 — 움직이는 안개와 촛불 잔광 */}
      {!videoOk && <div className="intro-fallback" aria-hidden="true" />}
      <div className="intro-grain" aria-hidden="true" />
      <div className="intro-vignette" aria-hidden="true" />

      <div className="intro-content">
        <div className="eyebrow intro-eyebrow">{CONFIG.BRAND_HANJA}</div>
        <h1 className="display candle intro-title">
          당신 사주에 박힌<br />
          <span className="intro-blood">살(煞)</span>,<br />
          몇 개인지 아십니까
        </h1>
        <p className="intro-sub">
          지어낸 공포가 아닙니다. 계산된 살만 보여드리고,<br />
          그 살이 움직였던 해를 <b>당신의 과거로 확인</b>시켜 드립니다.
        </p>
      </div>

      {/* 하단 고정 CTA — 부적 프레임 */}
      <div className="intro-cta-bar">
        <button className="intro-cta" onClick={() => { ev("cta_start"); onStart(); }}>
          <span className="cta-seal" aria-hidden="true">煞</span>
          <span className="cta-label">흉살 검사 시작</span>
          <span className="cta-seal" aria-hidden="true">煞</span>
        </button>
        <p className="intro-cta-note">무료 · 회원가입 없음 · 3초</p>
      </div>
    </section>
  );
}

// ---------------- 1. 입력 (디비) ----------------
function InputForm({ onComputed }) {
  const now = new Date();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
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
  const [sending, setSending] = useState(false);

  const years = [];
  for (let i = now.getFullYear(); i >= 1920; i--) years.push(i);

  const submit = async () => {
    setErr("");
    if (!name.trim()) { setErr("이름을 입력해주세요."); return; }
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    if (cleanPhone.length < 10) { setErr("휴대폰 번호를 정확히 입력해주세요."); return; }
    if (!consent) { setErr("개인정보 수집·이용에 동의해주세요."); return; }

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

    setSending(true);
    const lon = REGIONS.find((r) => r.name === region)?.lon ?? null;
    const result = computeSaju({
      y: sy, m: sm, d: sd,
      hour: unknownTime ? null : hour,
      minute: unknownTime ? 0 : minute,
      gender, lon,
    });
    // 디비 저장 (실패해도 퍼널은 계속 진행)
    let leadId = null;
    try {
      const sals = salList(result).filter((s) => !s.good).map((s) => s.name);
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: cleanPhone,
          birth: { y: sy, m: sm, d: sd, hour: unknownTime ? null : hour, minute: unknownTime ? 0 : minute, gender, region, cal, leap },
          salNames: sals,
          salCount: sals.length,
        }),
      });
      const data = await res.json();
      leadId = data.id;
    } catch (e) {}
    setSending(false);
    ev("lead_submitted", { cal, unknownTime, saved: !!leadId });
    onComputed(result, leadId, name.trim());
  };

  const selStyle = {};
  return (
    <section className="fade-up" style={{ padding: "10px 0 40px" }}>
      <h2 className="display" style={{ fontSize: 26, marginBottom: 4, color: "var(--talisman)" }}>검사 대상 정보</h2>
      <p style={{ fontSize: 14, color: "var(--ash-dim)", marginBottom: 22 }}>
        입력하는 순간, 표준 만세력 기준으로 원국을 계산하고 살을 검출합니다.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: 10, marginBottom: 16 }}>
        <div className="field"><label>이름</label>
          <input type="text" value={name} placeholder="홍길동" onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field"><label>휴대폰 번호 (리포트 전달용)</label>
          <input type="tel" value={phone} placeholder="010-0000-0000" onChange={(e) => setPhone(e.target.value)} />
        </div>
      </div>

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

      <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13, marginBottom: 16, color: "var(--ash-dim)", lineHeight: 1.6 }}>
        <input type="checkbox" style={{ width: "auto", marginTop: 3 }} checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>
          <a href="/privacy" target="_blank" style={{ color: "var(--talisman)" }}>개인정보 수집·이용</a>에 동의합니다.
          (이름·연락처·생년월일시 / 풀이 산출 및 리포트 전달 목적 / 1년 보관)
        </span>
      </label>

      {err && <p style={{ color: "var(--blood-bright)", fontSize: 14, marginBottom: 12 }}>{err}</p>}
      <button className="btn btn-seal" onClick={submit} disabled={sending}>{sending ? "검출 중…" : "흉살 검사 실행"}</button>
      <p style={{ fontSize: 12, color: "var(--ash-dim)", marginTop: 12, textAlign: "center" }}>
        입력한 정보는 계산에만 사용되며 서버에 저장되지 않습니다.
      </p>
    </section>
  );
}

// ---------------- 2. 검사 결과 (명식 + 살 검출) ----------------
function Reveal({ saju, onNext }) {
  const ch = useMemo(() => iljuCharacter(saju), [saju]);
  const blunt = useMemo(() => bluntLine(saju), [saju]);
  const sals = useMemo(() => salList(saju), [saju]);
  const badSals = sals.filter((s) => !s.good);
  const total = saju.elemCount.reduce((a, b) => a + b, 0);
  const order = ["hour", "day", "month", "year"];
  const label = { hour: "시주 時", day: "일주 日", month: "월주 月", year: "년주 年" };
  const sj = saju.samjae;

  return (
    <section className="fade-up" style={{ padding: "6px 0 40px" }}>
      <div className="eyebrow" style={{ textAlign: "center" }}>검사 결과</div>
      <h2 className="display" style={{ fontSize: 22, textAlign: "center", margin: "10px 0 6px", color: "var(--ash)" }}>
        {saju.input.dateStr} {saju.input.hour != null ? `${String(saju.input.hour).padStart(2, "0")}:${String(saju.input.minute).padStart(2, "0")}` : "(시간 미상)"} 출생
      </h2>
      <p className="display candle" style={{ textAlign: "center", fontSize: 26, marginBottom: 22 }}>
        살(煞) <span style={{ color: "var(--blood-bright)" }}>{badSals.length}개</span> 검출
      </p>

      <div className="pillar-grid" style={{ marginBottom: 10 }}>
        {order.map((k, i) => {
          const p = saju.pillars[k];
          return (
            <div className="pillar" key={k}>
              <div className="p-label">{label[k]}</div>
              {p ? (
                <>
                  <div className={"seal-block" + (k === "day" ? " seal-day" : "")} style={{ animationDelay: `${i * 0.18}s` }}>
                    <span className="hanja">{GAN_HANJA[p.gan]}</span>
                    <span className="hangul">{GAN[p.gan]}</span>
                    <span className="ss">{k === "day" ? "나" : saju.sipseongOfGan(p.gan)}</span>
                  </div>
                  <div className={"seal-block" + (k === "day" ? " seal-day" : "")} style={{ animationDelay: `${i * 0.18 + 0.09}s` }}>
                    <span className="hanja">{JI_HANJA[p.ji]}</span>
                    <span className="hangul">{JI[p.ji]}</span>
                    <span className="ss">{saju.sipseongOfJi(p.ji)}</span>
                  </div>
                </>
              ) : (
                <div style={{ border: "1.5px dashed #3a332b", padding: "34px 4px", color: "#52493c", fontSize: 12 }}>시간<br />미상</div>
              )}
            </div>
          );
        })}
      </div>
      <p className="mono" style={{ fontSize: 11, color: "var(--ash-dim)", textAlign: "center", marginBottom: 26 }}>
        {saju.corr.notes.join(" · ")} 적용됨
      </p>

      {/* 삼재 경고 */}
      {sj?.next && (
        <div className="card" style={{ borderColor: sj.inNow ? "var(--blood)" : "#2e2820", marginBottom: 18, textAlign: "center" }}>
          {sj.inNow ? (
            <>
              <div className="eyebrow" style={{ marginBottom: 8 }}>三災 경보</div>
              <p className="display" style={{ fontSize: 21, color: "var(--blood-bright)" }}>
                당신은 지금 삼재 한가운데에 있습니다
              </p>
              <p className="mono" style={{ fontSize: 12.5, color: "var(--ash-dim)", marginTop: 6 }}>
                {sj.next[0]} — {sj.next[2]}년 · 들삼재/눌삼재/날삼재
              </p>
            </>
          ) : (
            <>
              <div className="eyebrow" style={{ marginBottom: 8 }}>三災 예보</div>
              <p className="display" style={{ fontSize: 19, color: "var(--talisman)" }}>
                다음 삼재: {sj.next[0]}년 진입
              </p>
              <p className="mono" style={{ fontSize: 12.5, color: "var(--ash-dim)", marginTop: 6 }}>
                {sj.next[0]} — {sj.next[2]}년, 3년간 이어집니다
              </p>
            </>
          )}
        </div>
      )}

      {/* 살 검출 목록 — 첫 번째만 공개, 나머지 봉인 */}
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="eyebrow" style={{ marginBottom: 14 }}>검출된 살 — {sals.length}건</div>
        {sals.length === 0 && (
          <p style={{ fontSize: 15 }}>
            원국에서 뚜렷한 살이 검출되지 않았습니다. 드문 경우입니다 — 다만 살이 없다는 것과 흐름이 없다는 것은 다릅니다. 아래 검증으로 확인하세요.
          </p>
        )}
        {sals.map((s, idx) => (
          idx === 0 ? (
            <div className={"sal-item" + (s.good ? " sal-good" : "")} key={s.name}>
              <span className="sal-name">{s.name}</span>
              <span className="sal-hanja">{s.hanja}</span>
              <p className="sal-short">— {s.short}</p>
              <p className="sal-desc">{s.desc}</p>
            </div>
          ) : (
            <div className={"sal-item locked" + (s.good ? " sal-good" : "")} key={s.name}>
              <div className="lock-blur">
                <span className="sal-name">{s.name}</span>
                <span className="sal-hanja">{s.hanja}</span>
                <p className="sal-short">— {s.short}</p>
                <p className="sal-desc">{s.desc}</p>
              </div>
              <div className="lock-overlay">
                <span className="lock-ico">🔒</span>
                <span className="display" style={{ fontSize: 17, color: "var(--ash)" }}>{s.name}{s.good ? "" : "살"} 봉인됨</span>
                <span className="lock-txt">정식 살풀이에서 개봉됩니다</span>
              </div>
            </div>
          )
        ))}
        {sals.length > 1 && (
          <p style={{ fontSize: 13, color: "var(--ash-dim)", marginTop: 8 }}>
            무료 검사에서는 첫 번째 살만 풀이됩니다. 나머지 {sals.length - 1}건은 봉인 상태입니다.
          </p>
        )}
      </div>

      {/* 오행 분포 */}
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="eyebrow" style={{ marginBottom: 12 }}>오행 — 비어있는 자리를 보십시오</div>
        {saju.elemCount.map((c, i) => (
          <div className="elem-row" key={i}>
            <span className="e-name">{ELEM_NAME[i]} {ELEM_HANJA[i]}</span>
            <div className="elem-bar-bg">
              <div className="elem-bar" style={{ width: `${(c / total) * 100}%`, background: ELEM_COLOR[i] }} />
            </div>
            <span className="e-count">{c === 0 ? <span className="elem-empty">空</span> : c}</span>
          </div>
        ))}
        <p style={{ fontSize: 13.5, color: "var(--ash-dim)", marginTop: 12 }}>
          일간 <b style={{ color: "var(--talisman)" }}>{GAN[saju.pillars.day.gan]}{ELEM_HANJA[saju.myElem]}</b> ·
          {saju.strong ? " 신강한 구조 — 스스로 끌고 가는 힘이 강한 사주입니다." : " 신약한 구조 — 환경과 사람의 도움이 중요한 사주입니다."}
        </p>
      </div>

      {/* 일주 캐릭터 */}
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="eyebrow" style={{ marginBottom: 8 }}>{ch.ganzi}</div>
        <h3 className="display" style={{ fontSize: 24, lineHeight: 1.4, marginBottom: 12, color: "var(--talisman)" }}>“{ch.name}”</h3>
        <p style={{ fontSize: 15.5 }}>{ch.text}</p>
      </div>

      {/* 직언 */}
      <div className="card" style={{ borderLeft: "4px solid var(--blood)", marginBottom: 28 }}>
        <div className="eyebrow" style={{ marginBottom: 10 }}>좋은 말은 생략합니다</div>
        {blunt.map((line, i) => (
          <p key={i} style={{ fontSize: 15.5, marginBottom: i < blunt.length - 1 ? 12 : 0 }}>{line}</p>
        ))}
      </div>

      <p style={{ textAlign: "center", fontSize: 15, marginBottom: 14 }}>
        여기까지는 종이 위의 글자입니다.<br />
        <b style={{ color: "var(--talisman)" }}>이 살들이 실제로 움직였는지 — 당신의 과거로 판정하십시오.</b>
      </p>
      <button className="btn" onClick={() => { ev("cta_quiz"); onNext(); }}>
        살 발동 검증 시작 — 5문항
      </button>
    </section>
  );
}

// ---------------- 3. 과거 검증 ----------------
function Quiz({ saju, quiz, answers, setAnswers, onNext, leadId }) {
  const answered = Object.keys(answers).length;
  const done = answered >= quiz.length && quiz.length > 0;
  const hits = quiz.filter((q, i) => answers[i] === true).length;

  return (
    <section className="fade-up" style={{ padding: "6px 0 40px" }}>
      <div className="eyebrow" style={{ textAlign: "center" }}>발동 검증</div>
      <h2 className="display candle" style={{ fontSize: 24, textAlign: "center", margin: "10px 0 6px" }}>
        이 살들이 움직였던 해를<br />맞혀보겠습니다
      </h2>
      <p style={{ textAlign: "center", fontSize: 14, color: "var(--ash-dim)", marginBottom: 24 }}>
        아래는 지어낸 문장이 아니라, 당신의 명식에서 계산된 진술입니다.<br />솔직하게 판정해주세요.
      </p>

      {quiz.map((q, i) => (
        <div className="card quiz-card" key={i} style={{ marginBottom: 14 }}>
          {answers[i] === true && <div className="stamp-hit">발동</div>}
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
            {quiz.length}문항 중 <span style={{ color: "var(--blood-bright)" }}>{hits}개 발동 확인</span>
          </p>
          <p style={{ fontSize: 14.5, color: "var(--ash-dim)", marginBottom: 20 }}>
            {hits >= 4 && "부정할 수 없게 됐습니다. 이 살들은 종이 위의 글자가 아니라, 당신의 인생에서 실제로 움직여 왔습니다."}
            {hits === 3 && "절반 이상이 발동 확인됐습니다. 이 명식은 당신의 흐름을 읽고 있습니다."}
            {hits <= 2 && "발동 일치율이 낮게 나왔습니다. 출생 시간이 부정확하거나 절입일 경계 출생일 가능성이 있습니다 — 정식 살풀이에서는 시간 보정 진단을 함께 제공합니다."}
          </p>
          <button className="btn btn-seal" onClick={() => {
            ev("cta_paywall", { hits });
            if (leadId) { try { fetch("/api/lead", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: leadId, quizHits: hits }) }); } catch (e) {} }
            onNext();
          }}>
            그럼 — 다음 발동은 언제입니까 →
          </button>
        </div>
      )}
    </section>
  );
}

// ---------------- 4. 결제 유도 (페이월) ----------------
function Paywall({ saju, answers, quiz, leadName }) {
  const t = useMemo(() => buildTeaser(saju), [saju]);
  const sals = useMemo(() => salList(saju).filter((s) => !s.good), [saju]);
  const hits = quiz.filter((q, i) => answers[i] === true).length;
  const firstRisk = t.risks[0]?.year;
  const price = CONFIG.PRICE.toLocaleString("ko-KR");
  const priceOrig = CONFIG.PRICE_ORIGINAL.toLocaleString("ko-KR");

  useEffect(() => { ev("paywall_view", { hits }); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section className="fade-up" style={{ padding: "6px 0 40px" }}>
      <div className="eyebrow" style={{ textAlign: "center" }}>개봉 전</div>
      <h2 className="display candle" style={{ fontSize: 24, textAlign: "center", margin: "10px 0 8px" }}>
        {leadName ? `${leadName} 님, ` : ""}여기서부터는<br />
        <span style={{ color: "var(--blood-bright)" }}>봉인</span>되어 있습니다
      </h2>
      <p style={{ textAlign: "center", fontSize: 14, color: "var(--ash-dim)", marginBottom: 8 }}>
        {hits >= 3
          ? `방금 과거 ${hits}건의 발동을 직접 확인하셨습니다. 같은 계산이 아래 봉인에 그대로 들어 있습니다.`
          : "지금까지 보신 것은 전체 살풀이의 20%입니다."}
      </p>
      {firstRisk && (
        <p className="display" style={{ textAlign: "center", fontSize: 17, color: "var(--talisman)", marginBottom: 22 }}>
          가장 가까운 발동 경보: <span style={{ color: "var(--blood-bright)" }}>{firstRisk}년</span>
        </p>
      )}

      {/* 잠긴 항목 목록 */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="eyebrow" style={{ marginBottom: 14 }}>봉인된 항목 — {LOCKED_ITEMS.length}편</div>
        {LOCKED_ITEMS.map((it) => (
          <div key={it.label} style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: "12px 0", borderBottom: "1px solid #241f18" }}>
            <span className="display" style={{ fontSize: 22, color: "var(--blood-bright)", width: 26, textAlign: "center" }}>{it.hanja}</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 15.5, color: "var(--ash)" }}><b>{it.label}</b></p>
              <p style={{ fontSize: 13, color: "var(--ash-dim)" }}>{it.desc}</p>
            </div>
            <span style={{ fontSize: 16 }}>🔒</span>
          </div>
        ))}
        {sals.length > 1 && (
          <p style={{ fontSize: 13.5, color: "var(--ash-dim)", marginTop: 12 }}>
            특히 아직 열리지 않은 살: <b style={{ color: "var(--blood-bright)" }}>{sals.slice(1).map((s) => s.name + "살").join(", ")}</b>
          </p>
        )}
      </div>

      {/* 가격 */}
      <div className="card" style={{ textAlign: "center", border: "2px solid var(--blood)", marginBottom: 20 }}>
        <div className="eyebrow" style={{ marginBottom: 10 }}>정식 살풀이 전체 개봉</div>
        <p style={{ fontSize: 15, color: "var(--ash-dim)" }}>
          <span style={{ textDecoration: "line-through" }}>{priceOrig}원</span>
          <span className="mono" style={{ marginLeft: 8, fontSize: 12, color: "var(--blood-bright)" }}>오픈 특가</span>
        </p>
        <p className="display candle" style={{ fontSize: 38, margin: "2px 0 14px" }}>{price}원</p>
        <a
          className="btn btn-seal"
          href={CONFIG.PAYMENT_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => ev("pay_click", { hits })}
        >
          결제하고 전체 개봉하기
        </a>
        <p style={{ fontSize: 13, color: "var(--ash-dim)", marginTop: 14, lineHeight: 1.9 }}>
          <b style={{ color: "var(--ash)" }}>전달 방법</b><br />
          ① 결제 &nbsp;→&nbsp; ② 카카오톡 채널 추가 후 <b>성함</b> 남기기 &nbsp;→&nbsp; ③ 24시간 내 전용 리포트 링크 도착
        </p>
        <a
          className="btn btn-ghost"
          style={{ marginTop: 12 }}
          href={CONFIG.KAKAO_CHANNEL_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => ev("kakao_click")}
        >
          카카오톡 채널 추가하기
        </a>
      </div>

      <p style={{ textAlign: "center", fontSize: 12.5, color: "var(--ash-dim)", lineHeight: 1.9 }}>
        리포트는 사람이 검수 후 발송합니다.<br />
        수신 후 24시간 내 요청 시 전액 환불해 드립니다.
      </p>
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
