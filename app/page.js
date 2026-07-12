"use client";
// ============================================================
// 자미연 퍼널 (용용 골격 80% + 자미연 스킨 20%)
// 롱폼 랜딩 → 문답(성별~고민) → 총운 진단(무료+봉인) → 3단 상품 결제 → 紅線
// ============================================================
import { useState, useMemo, useRef, useEffect } from "react";
import { computeZiwei, JI, STAR_HANJA } from "../lib/ziwei";
import {
  CONFIG, ELDER, OFFER, TRUST, REPORT_ITEMS, MATCHING, TIME_SLOTS,
  STAR_SELF, STAR_SPOUSE, STAR_TAG, EMPTY_SPOUSE, SOCIAL_PROOF,
  AVATARS, AVATAR_META, INTERESTS, MATCH_UI, LANDING, PRODUCTS, REVIEWS, BANK, LEGAL, tossLink,
} from "../lib/content";
import { track } from "@vercel/analytics";
import ReadingShow from "./ReadingShow";

const FBQ_MAP = { lead_submitted: "Lead", pay_click: "InitiateCheckout", pay_view: "ViewContent", match_apply: "SubmitApplication" };
function ev(name, data) {
  try { track(name, data || {}); } catch (e) {}
  try {
    if (typeof window !== "undefined" && window.fbq) {
      if (FBQ_MAP[name]) window.fbq("track", FBQ_MAP[name]);
      else window.fbq("trackCustom", name, data || {});
    }
  } catch (e) {}
}

function captureUtm() {
  try {
    const saved = localStorage.getItem("jm_utm");
    if (saved) return JSON.parse(saved);
    const p = new URLSearchParams(window.location.search);
    const utm = {};
    for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) {
      if (p.get(k)) utm[k] = p.get(k);
    }
    if (document.referrer) utm.ref = document.referrer.slice(0, 120);
    if (Object.keys(utm).length) localStorage.setItem("jm_utm", JSON.stringify(utm));
    return utm;
  } catch (e) { return {}; }
}

const INPUT_STEPS = ["gender", "birth", "time", "phone", "name", "concern"];

export default function Home() {
  const [step, setStep] = useState("intro");
  const [form, setForm] = useState({
    gender: null, cal: "solar", leap: false,
    y: null, m: null, d: null, slot: null, timeUnknown: false,
    phone: "", name: "", concern: "", consent: false,
  });
  const [ziwei, setZiwei] = useState(null);
  const [leadId, setLeadId] = useState(null);
  const [leadToken, setLeadToken] = useState(null);
  const [lastSnap, setLastSnap] = useState(null);
  const topRef = useRef(null);

  useEffect(() => {
    captureUtm();
    try {
      const s = localStorage.getItem("jm_last");
      if (s) setLastSnap(JSON.parse(s));
      const f = localStorage.getItem("jm_form");
      if (f) {
        const saved = JSON.parse(f);
        setForm((prev) => ({ ...prev, ...saved, consent: false }));
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    try {
      const { consent, ...rest } = form;
      localStorage.setItem("jm_form", JSON.stringify(rest));
    } catch (e) {}
  }, [form]);

  const goto = (s) => {
    setStep(s);
    ev("step_" + s);
    setTimeout(() => topRef.current?.scrollIntoView({ behavior: "auto" }), 20);
  };

  const startFunnel = () => {
    import("korean-lunar-calendar").catch(() => {});
    goto("gender");
  };

  const resume = async () => {
    if (!lastSnap) return;
    try {
      const mod = await import("korean-lunar-calendar");
      const KLC = mod.default || mod;
      const c = new KLC();
      if (!c.setSolarDate(lastSnap.y, lastSnap.m, lastSnap.d)) return;
      const lun = c.getLunarCalendar();
      const z = computeZiwei({
        lunarYear: lun.year, lunarMonth: lun.month, lunarDay: lun.day,
        hourBranch: lastSnap.slot, gender: lastSnap.gender,
        solarYear: lastSnap.y, solarMonth: lastSnap.m, solarDay: lastSnap.d,
      });
      setZiwei(z);
      setForm((f) => ({ ...f, name: lastSnap.name || "", gender: lastSnap.gender, slot: lastSnap.slot }));
      if (lastSnap.token) setLeadToken(lastSnap.token);
      ev("resume_diag");
      goto("diag");
    } catch (e) {}
  };

  const submitAll = async () => {
    let sy = form.y, sm = form.m, sd = form.d;
    let mod;
    try { mod = await import("korean-lunar-calendar"); }
    catch (e) { alert("달력 모듈 로드 실패 — 새로고침 후 다시 시도해주세요."); return; }
    const KLC = mod.default || mod;
    if (form.cal === "lunar") {
      const c = new KLC();
      if (!c.setLunarDate(form.y, form.m, form.d, form.leap)) {
        alert("음력 날짜를 변환할 수 없습니다. 날짜를 확인해주세요.");
        goto("birth"); return;
      }
      const s = c.getSolarCalendar();
      sy = s.year; sm = s.month; sd = s.day;
    }
    const c2 = new KLC();
    if (!c2.setSolarDate(sy, sm, sd)) { alert("지원하지 않는 날짜입니다."); goto("birth"); return; }
    const lun = c2.getLunarCalendar();

    const z = computeZiwei({
      lunarYear: lun.year, lunarMonth: lun.month, lunarDay: lun.day,
      hourBranch: form.slot, gender: form.gender,
      solarYear: sy, solarMonth: sm, solarDay: sd,
    });
    setZiwei(z);
    goto("checking");

    try {
      localStorage.setItem("jm_last", JSON.stringify({ y: sy, m: sm, d: sd, slot: form.slot, gender: form.gender, name: form.name.trim() }));
    } catch (e) {}

    try {
      const myeong = z.palaceAt("명궁");
      const eff = z.effectiveMajors(myeong);
      const nowYear = new Date().getFullYear();
      const nd = z.daehan.map((d) => ({ ...d, startYear: sy + d.startAge - 1 })).find((d) => d.startYear >= nowYear);
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.replace(/[^0-9]/g, ""),
          birth: {
            y: sy, m: sm, d: sd, slotIdx: form.slot,
            slot: form.timeUnknown ? "미상(오시 추정)" : TIME_SLOTS[form.slot].label,
            gender: form.gender, cal: form.cal, leap: form.leap,
            concern: form.concern.trim().slice(0, 200) || null,
            utm: captureUtm(),
          },
          salNames: [
            `명궁:${eff.stars.join("·") || "공궁"}`,
            `재백:${z.effectiveMajors(z.palaceAt("재백궁")).stars.join("·")}`,
            nd ? `대운:${nd.startYear}` : "",
          ].filter(Boolean),
          salCount: eff.stars.length,
        }),
      });
      const data = await res.json();
      setLeadId(data.id);
      setLeadToken(data.token || null);
      try {
        const s = JSON.parse(localStorage.getItem("jm_last") || "{}");
        s.token = data.token || null;
        localStorage.setItem("jm_last", JSON.stringify(s));
      } catch (e) {}
      ev("lead_submitted", { saved: !!data.id, concern: !!form.concern.trim() });
    } catch (e) { ev("lead_submitted", { saved: false }); }
    setTimeout(() => goto("diag"), 2200);
  };

  return (
    <main className="phone">
      <div ref={topRef} />
      {step === "intro" && <Landing onStart={startFunnel} onResume={lastSnap ? resume : null} />}
      {INPUT_STEPS.includes(step) && (
        <ElderFlow step={step} form={form} setForm={setForm} goto={goto} onSubmit={submitAll} />
      )}
      {step === "checking" && <Checking />}
      {step === "diag" && ziwei && <Diagnosis z={ziwei} name={form.name} timeUnknown={form.timeUnknown} onPay={() => goto("pay")} />}
      {step === "pay" && ziwei && <Payment leadId={leadId} leadToken={leadToken} birthYear={ziwei.input.solarYear} onBack={() => goto("diag")} />}
    </main>
  );
}

// ---------------- 사이트 푸터 ----------------
function SiteFooter() {
  return (
    <footer style={{ position: "relative", zIndex: 2 }}>
      <p>
        {CONFIG.BRAND}({CONFIG.BRAND_HANJA}) · 문의: 안내 문자 회신 · <a href="/privacy" style={{ color: "var(--tx-dim)" }}>개인정보처리방침</a>
        {LEGAL.LINES.filter((l) => !l.includes("REPLACE")).map((l) => <span key={l}><br />{l}</span>)}
        <br />{LEGAL.REFUND}
      </p>
    </footer>
  );
}

// ---------------- 산수 실루엣 ----------------
function Mountains() {
  return (
    <div className="mts" aria-hidden="true">
      <svg viewBox="0 0 430 250" preserveAspectRatio="none" style={{ opacity: 0.55 }}>
        <path fill="#181643" d="M0,250 L0,150 C40,120 70,160 110,130 C150,100 170,150 215,110 C260,70 290,140 340,105 C380,80 410,130 430,115 L430,250 Z" />
      </svg>
      <svg viewBox="0 0 430 190" preserveAspectRatio="none" style={{ marginTop: -160, opacity: 0.8 }}>
        <path fill="#100f33" d="M0,190 L0,120 C50,90 80,135 130,100 C175,70 200,125 250,95 C300,65 330,120 380,90 C405,75 420,95 430,88 L430,190 Z" />
      </svg>
      <svg viewBox="0 0 430 130" preserveAspectRatio="none" style={{ marginTop: -105 }}>
        <path fill="#0a0922" d="M0,130 L0,85 C60,60 110,95 160,72 C215,48 250,90 305,68 C355,50 395,78 430,62 L430,130 Z" />
      </svg>
    </div>
  );
}

// ---------------- 랜딩 스크롤 생존 추적 ----------------
// 각 섹션에 최초 1회 도달 시 sec_* 이벤트 발사 → 랜딩 어느 지점에서 이탈하는지 파악
function useSectionTrack() {
  useEffect(() => {
    const els = document.querySelectorAll("[data-sec]");
    const fired = new Set();
    const io = new IntersectionObserver(
      (ents) =>
        ents.forEach((e) => {
          const name = e.target.getAttribute("data-sec");
          if (e.isIntersecting && !fired.has(name)) {
            fired.add(name);
            ev("sec_" + name);
          }
        }),
      { threshold: 0.3 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

// ---------------- 스크롤 등장 & 카운트업 ----------------
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".rv");
    const io = new IntersectionObserver(
      (ents) => ents.forEach((e) => e.isIntersecting && e.target.classList.add("in")),
      { threshold: 0.18 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

function CountUp({ end, suffix, duration = 1400 }) {
  const ref = useRef(null);
  const [val, setVal] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf, started = false;
    const io = new IntersectionObserver((ents) => {
      if (ents[0].isIntersecting && !started) {
        started = true;
        const t0 = performance.now();
        const tick = (t) => {
          const p = Math.min(1, (t - t0) / duration);
          setVal(Math.floor(end * (1 - Math.pow(1 - p, 3))));
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        io.disconnect();
      }
    }, { threshold: 0.5 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [end, duration]);
  return <span ref={ref}>{val.toLocaleString("ko-KR")}{suffix}</span>;
}

// ---------------- 0. 롱폼 랜딩 ----------------
function Landing({ onStart, onResume }) {
  useReveal();
  useSectionTrack();
  return (
    <div className="land">
      {/* ═══ 히어로 ═══ */}
      <section className="hero" style={{ minHeight: "94svh" }}>
        <div className="nebula" aria-hidden="true" />
        <div className="stars" /><div className="stars2" />
        <div className="shooting" aria-hidden="true" />
        <div className="moon" aria-hidden="true" />

        <div className="hero-top">
          <span className="logo">{CONFIG.BRAND_HANJA}</span>
          <span className="line" aria-hidden="true" />
          <span className="eyebrow">{CONFIG.CLAIM}</span>
        </div>

        {/* 석문 기둥 */}
        <div className="pillars" aria-hidden="true">
          <i /><i /><i /><i />
        </div>

        <div className="hero-copy" style={{ marginTop: "15svh" }}>
          <span className="hero-chip">紫微斗數 · 황실의 별자리 운세법</span>
          <h1 className="hook">
            {LANDING.HOOK_TOP}<br />
            <span className="year-glow">{LANDING.HOOK_YEAR}<span className="veil" aria-hidden="true">9</span>년</span>에<br />
            시작됩니다.
          </h1>
          <p className="hero-sub2">당신의 황금기는 이미 명반(命盤)에 적혀 있습니다.</p>
        </div>

        <Mountains />
        <div className="scroll-hint" aria-hidden="true">︾</div>
      </section>

      {/* ═══ 도대체 왜 ═══ */}
      <section className="lsec" data-sec="why" style={{ textAlign: "center" }}>
        <p className="l-why0 rv">도대체</p>
        <p className="l-why1 rv">왜?</p>
        <p className="l-why2 rv">자미두수가<br />이렇게 유명할까요?</p>
      </section>

      {/* ═══ 황실 권위 ═══ */}
      <section className="lsec" data-sec="royal">
        <div className="royal-card rv">
          <span className="royal-rail" aria-hidden="true">皇室秘傳</span>
          <span className="sec-kicker">壹 · 기원</span>
          <h2 className="l-title">{LANDING.ROYAL_T.split("\n").map((l, i) => <span key={i}>{l}<br /></span>)}</h2>
          <p className="l-desc">{LANDING.ROYAL_D}</p>
          <div className="royal-line" aria-hidden="true"><i>宋</i><em /><i>紫微斗數</i><em /><i>今</i></div>
        </div>
      </section>

      {/* ═══ 카테고리 공격 ═══ */}
      <section className="lsec" data-sec="ask" style={{ textAlign: "center" }}>
        <span className="sec-kicker rv">貳 · 질문</span>
        <h2 className="l-attack2 rv">
          아직도 <span className="strike-word">사주<i aria-hidden="true" /></span>만<br />보세요?
        </h2>
        <p className="l-desc rv" style={{ marginTop: 14 }}>
          {LANDING.ATTACK_D.split("\n").map((l, i) => <span key={i}>{l}<br /></span>)}
        </p>
      </section>

      {/* ═══ 170배 비교 ═══ */}
      <section className="lsec" data-sec="170x">
        <span className="sec-kicker rv">參 · 근거</span>
        <h2 className="l-title rv">{LANDING.COMPARE_T.split("\n").map((l, i) => <span key={i}>{l}<br /></span>)}</h2>
        <p className="l-desc rv" style={{ marginBottom: 22 }}>{LANDING.COMPARE_D}</p>

        <div className="vs-wrap rv">
          <div className="stat">
            <span className="stat-name">사주 8자</span>
            <b className="stat-num"><CountUp end={51} suffix="만 개" /></b>
            <span className="stat-sub">경우의 수</span>
            <div className="bar"><i style={{ width: "4%" }} /></div>
          </div>
          <span className="vs-seal" aria-hidden="true">VS</span>
          <div className="stat hot">
            <span className="stat-name">자미두수 12궁</span>
            <b className="stat-num"><CountUp end={8700} suffix="만 개+" /></b>
            <span className="stat-sub">경우의 수</span>
            <div className="bar hot"><i style={{ width: "100%" }} /></div>
          </div>
        </div>
        <p className="x170 rv">× <b>170배</b> 촘촘한 해석</p>

        <div className="check-list2">
          {LANDING.CHECKS.map((t, i) => (
            <div className="check-card rv" key={t}>
              <span className="cc-hanja">{["盤", "宮", "限"][i]}</span>
              <p>{t}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ 후기 or 검증 ═══ */}
      <section className="lsec" data-sec="proof">
        {REVIEWS.enabled && REVIEWS.items.length > 0 ? (
          <>
            <span className="sec-kicker rv">肆 · 후기</span>
            <h2 className="l-title rv" style={{ fontSize: 25 }}>리뷰 <span style={{ color: "var(--gold)" }}>{REVIEWS.ratingLine}</span></h2>
            <div className="rv-scroll">
              {REVIEWS.items.map((r, i) => (
                <div className="review" key={i}>
                  <div className="rv-top"><b>{r.mask}</b><span>{r.ilju}</span><span className="rv-star">★5.0</span><span className="rv-date">{r.date}</span></div>
                  <p>{r.text}</p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="verify-card rv">
            <span className="sec-kicker">肆 · 검증</span>
            <h2 className="l-title" style={{ fontSize: 25 }}>별의 위치는<br />사람이 찍지 않습니다</h2>
            <div className="check-list" style={{ marginTop: 14 }}>
              {TRUST.map((t) => <p key={t}><span className="ck">✓</span>{t}</p>)}
              <p><span className="ck">✓</span>좋은 말만 하지 않습니다 — 걸리는 배치까지 전부 말씀드립니다</p>
            </div>
          </div>
        )}
      </section>

      {/* ═══ 파이널 ═══ */}
      <section className="lsec final-sec" data-sec="final" style={{ textAlign: "center", paddingBottom: 190 }}>
        <div className="final-moon" aria-hidden="true" />
        <h2 className="l-title rv" style={{ fontSize: 30, textAlign: "center" }}>
          {LANDING.FINAL_T.split("\n").map((l, i) => <span key={i}>{l}<br /></span>)}
        </h2>
        {onResume && <button className="resume-chip rv" onClick={onResume}>지난 감정 다시 보기 →</button>}
        <SiteFooter />
      </section>

      <div className="land-bar">
        {SOCIAL_PROOF.enabled && (
          <div className="social-pill">💜 <b>{SOCIAL_PROOF.buyers}명</b>이 확인했어요</div>
        )}
        <button className="cta" onClick={() => { ev("cta_start"); onStart(); }}>
          {LANDING.CTA}
          <small>{LANDING.CTA_SUB}</small>
        </button>
      </div>
    </div>
  );
}

// ---------------- 1. 노인 문답 ----------------
function ElderFlow({ step, form, setForm, goto, onSubmit }) {
  const idx = INPUT_STEPS.indexOf(step);
  const next = () => goto(INPUT_STEPS[idx + 1]);
  const back = () => goto(idx === 0 ? "intro" : INPUT_STEPS[idx - 1]);
  const NUM = { gender: "問 一", birth: "問 二", time: "問 三", phone: "問 四", name: "問 五", concern: "問 六" };
  const MARK = { gender: "性", birth: "生", time: "時", phone: "絡", name: "名", concern: "憂" };
  const E = ELDER[step];

  const rows = [];
  if (form.name && idx > INPUT_STEPS.indexOf("name")) rows.push({ k: "이름", v: form.name, s: "name" });
  if (form.phone && idx > INPUT_STEPS.indexOf("phone")) rows.push({ k: "연락처", v: form.phone, s: "phone" });
  if (form.slot != null && idx > INPUT_STEPS.indexOf("time")) rows.push({ k: "생시", v: form.timeUnknown ? "미상(오시 추정)" : TIME_SLOTS[form.slot].label, s: "time" });
  if (form.y && idx > INPUT_STEPS.indexOf("birth")) rows.push({ k: "생년월일", v: `${form.y}년 ${form.m}월 ${form.d}일 (${form.cal === "solar" ? "양력" : "음력"})`, s: "birth" });
  if (form.gender && idx > INPUT_STEPS.indexOf("gender")) rows.push({ k: "그대는", v: form.gender === "M" ? "남자" : "여자", s: "gender" });

  return (
    <section className="ask">
      <div className="stars" />
      <div className="ask-progress" aria-hidden="true"><i style={{ width: `${((idx + 1) / INPUT_STEPS.length) * 100}%` }} /></div>
      <button className="back-btn" onClick={back} aria-label="이전으로">‹</button>
      <div className="ask-mark" aria-hidden="true">{MARK[step]}</div>
      <div className="elder-moon" aria-hidden="true" />

      <div style={{ position: "relative", zIndex: 2 }} key={step} className="fade-step">
        {step === "gender" ? (
          <p className="say">{ELDER.intro.split("\n").map((l, i) => <span key={i}>{l}<br /></span>)}</p>
        ) : (
          <>
            <span className="qnum">{NUM[step]}</span>
            <h2 className="q">{E.q}</h2>
            {E.sub && <p className="qsub">{E.sub}</p>}
          </>
        )}

        <div className="ask-input">
          {step === "birth" && <BirthInput form={form} setForm={setForm} onDone={next} />}
          {step === "time" && <TimeInput form={form} setForm={setForm} onDone={next} />}
          {step === "phone" && <PhoneInput form={form} setForm={setForm} onDone={next} />}
          {step === "name" && <NameInput form={form} setForm={setForm} onDone={next} />}
          {step === "concern" && <ConcernInput form={form} setForm={setForm} onDone={onSubmit} />}
        </div>

        {rows.length > 0 && (
          <div className="prev-rows">
            {rows.map((r) => (
              <div className="prow" key={r.k}>
                <span className="k">{r.k}</span>
                <button className="v" onClick={() => goto(r.s)}>{r.v} <i>✎</i></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {step === "gender" && (
        <div className="gender-sheet">
          <h2 className="sheet-q">{ELDER.gender.q}</h2>
          <button className="sheet-btn" onClick={() => { setForm({ ...form, gender: "F" }); ev("gender_set"); next(); }}>여자입니다</button>
          <button className="sheet-btn" onClick={() => { setForm({ ...form, gender: "M" }); ev("gender_set"); next(); }}>남자입니다</button>
        </div>
      )}
    </section>
  );
}

function BirthInput({ form, setForm, onDone }) {
  const [val, setVal] = useState(form.y ? `${form.y}${String(form.m).padStart(2, "0")}${String(form.d).padStart(2, "0")}` : "");
  const digits = val.replace(/[^0-9]/g, "").slice(0, 8);
  const disp = digits.length >= 5
    ? `${digits.slice(0, 4)}년 ${digits.slice(4, 6)}월 ${digits.slice(6, 8)}일`
    : digits.length >= 4 ? `${digits.slice(0, 4)}년 ${digits.slice(4)}` : digits;
  const problem = (() => {
    if (digits.length !== 8) return null;
    const y = +digits.slice(0, 4), m = +digits.slice(4, 6), d = +digits.slice(6, 8);
    if (y < 1930 || y > new Date().getFullYear()) return "연도를 다시 확인해주시게.";
    if (m < 1 || m > 12) return "월(月)이 맞지 않네.";
    if (d < 1 || d > 31) return "일(日)이 맞지 않네.";
    return null;
  })();
  const valid = digits.length === 8 && !problem;
  const commit = () => {
    if (!valid) return;
    setForm({ ...form, y: +digits.slice(0, 4), m: +digits.slice(4, 6), d: +digits.slice(6, 8) });
    ev("birth_set");
    onDone();
  };
  return (
    <div>
      <div className="cal-toggle">
        <button className={form.cal === "solar" ? "on" : ""} onClick={() => setForm({ ...form, cal: "solar" })}>양력</button>
        <button className={form.cal === "lunar" ? "on" : ""} onClick={() => setForm({ ...form, cal: "lunar" })}>음력</button>
      </div>
      <input className="field" inputMode="numeric" placeholder="0000년 00월 00일" value={disp}
        onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => e.key === "Enter" && commit()} autoFocus />
      {problem && <p className="input-hint">{problem}</p>}
      {form.cal === "lunar" && (
        <label className="chk"><input type="checkbox" checked={form.leap} onChange={(e) => setForm({ ...form, leap: e.target.checked })} /> 윤달</label>
      )}
      <button className="next" disabled={!valid} onClick={commit}>다 음</button>
    </div>
  );
}

function TimeInput({ form, setForm, onDone }) {
  return (
    <div>
      <div className="slot-grid">
        <button className={"slot-btn" + (form.timeUnknown ? " on" : "")}
          onClick={() => { setForm({ ...form, slot: 6, timeUnknown: true }); ev("time_set", { known: false }); onDone(); }}>
          시간 모름 (정오 기준 추정 명반 — 정밀도 낮아짐)
        </button>
        {TIME_SLOTS.map((s, i) => (
          <button key={s.label} className={"slot-btn" + (form.slot === i && !form.timeUnknown ? " on" : "")}
            onClick={() => { setForm({ ...form, slot: i, timeUnknown: false }); ev("time_set", { known: true }); onDone(); }}>
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function PhoneInput({ form, setForm, onDone }) {
  const digits = form.phone.replace(/[^0-9]/g, "");
  const disp = digits.length > 7 ? `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`
    : digits.length > 3 ? `${digits.slice(0, 3)}-${digits.slice(3)}` : digits;
  const valid = digits.length >= 10;
  const commit = () => { if (valid) { ev("phone_set"); onDone(); } };
  return (
    <div>
      <input className="field" inputMode="tel" placeholder="010-0000-0000" value={disp}
        onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/[^0-9]/g, "").slice(0, 11) })}
        onKeyDown={(e) => e.key === "Enter" && commit()} autoFocus />
      <button className="next" disabled={!valid} onClick={commit}>다 음</button>
    </div>
  );
}

function NameInput({ form, setForm, onDone }) {
  const valid = form.name.trim().length >= 1 && form.consent;
  return (
    <div>
      <input className="field" placeholder="이름" value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value.slice(0, 12) })} autoFocus />
      <label className="chk">
        <input type="checkbox" checked={form.consent} onChange={(e) => setForm({ ...form, consent: e.target.checked })} />
        <span>만 19세 이상이며, <a href="/privacy" target="_blank">개인정보 수집·이용</a>에 동의합니다 (감정 산출·전달 목적)</span>
      </label>
      <button className="next" disabled={!valid} onClick={() => { ev("name_set"); onDone(); }}>다 음</button>
    </div>
  );
}

function ConcernInput({ form, setForm, onDone }) {
  return (
    <div>
      <textarea
        className="concern-ta"
        placeholder="이직인지, 그 사람인지, 돈인지 — 적어두면 감정서에서 답해줌세."
        value={form.concern}
        maxLength={200}
        onChange={(e) => setForm({ ...form, concern: e.target.value })}
        autoFocus
      />
      <p className="concern-count">{form.concern.length}/200</p>
      <button className="go-cta" onClick={() => { ev("concern_set", { has: !!form.concern.trim() }); onDone(); }}>
        명반 분석 시작하기 ›
      </button>
      <button className="skip-link" onClick={() => { setForm({ ...form, concern: "" }); ev("concern_skip"); onDone(); }}>
        딱히 없네, 바로 봐주시게
      </button>
    </div>
  );
}

// ---------------- 2. 확인 중 ----------------
function Checking() {
  return (
    <section className="ask" style={{ justifyContent: "center", alignItems: "center", textAlign: "center" }}>
      <div className="stars" />
      <div className="ask-mark" style={{ right: "auto", left: "50%", transform: "translateX(-50%)" }} aria-hidden="true">命</div>
      <p className="say" style={{ position: "relative", zIndex: 2 }}>
        {ELDER.checking.split("\n").map((l, i) => <span key={i}>{l}<br /></span>)}
      </p>
      <p className="mono" style={{ position: "relative", zIndex: 2, fontSize: 10, letterSpacing: "0.34em", color: "var(--amethyst-hi)", marginTop: 16 }}>命盤 展開 中</p>
    </section>
  );
}

// ---------------- 3. 총운 진단 (무료 + 봉인) ----------------
function firstSentence(text) {
  const m = text.match(/^.*?다\./);
  return m ? m[0] : text.slice(0, 45);
}

function Diagnosis({ z, name, timeUnknown, onPay }) {
  const myeong = z.palaceAt("명궁");
  const effM = z.effectiveMajors(myeong);
  const mainStar = effM.stars[0];
  const selfText = mainStar ? STAR_SELF[mainStar] : "명궁이 비어 맞은편 별을 빌려 쓰는 명 — 환경과 시기가 남들보다 크게 작용하는, 열린 그릇입니다.";

  const jaebaek = z.effectiveMajors(z.palaceAt("재백궁")).stars;
  const buche = z.effectiveMajors(z.palaceAt("부처궁"));
  const spouseStar = buche.stars[0];
  const spouseText = spouseStar ? STAR_SPOUSE[spouseStar] : EMPTY_SPOUSE;

  const nowYear = new Date().getFullYear();
  const nd = useMemo(
    () => z.daehan.map((d) => ({ ...d, startYear: z.input.solarYear + d.startAge - 1 })).find((d) => d.startYear >= nowYear),
    [z] // eslint-disable-line
  );
  const giStar = Object.entries(z.sahwa).find(([, k]) => k === "기")?.[0];
  useEffect(() => { ev("diag_view", { star: mainStar || "공궁" }); }, []); // eslint-disable-line

  return (
    <section className="diag">
      <div className="stars" />

      <p className="whisper">{name ? `${name}...` : "허어..."}<br />별이 크게 움직이는 명이군.</p>
      {timeUnknown && (
        <p className="tu-note">※ 시진 미상 — 정오(午時) 기준 추정 명반일세. 태어난 시를 확인해 오면 카카오톡으로 다시 봐줌세.</p>
      )}

      {/* 명궁 — 대공개 */}
      <div className="gcard">
        <h3><span className="gh">命</span> 그대의 명궁(命宮)에 앉은 별</h3>
        <div className="star-reveal">
          <span className="orbit" aria-hidden="true" />
          <div className="star-hanja" style={effM.stars.length > 1 ? { fontSize: 52 } : {}}>
            {effM.stars.map((s) => STAR_HANJA[s]).join("·") || "空"}
          </div>
          <div className="star-name">{effM.stars.map((s) => s + "성").join(" · ") || "공궁(空宮)"}{effM.borrowed && effM.stars.length > 0 ? " — 차성(借星)" : ""}</div>
          {mainStar && <div className="star-tag">{STAR_TAG[mainStar]}</div>}
        </div>
        <p className="open-tx">{firstSentence(selfText)}</p>
        <p className="blur-tx" aria-hidden="true">
          {selfText.slice(firstSentence(selfText).length)} 이 별이 그대의 재물·직업·인연에서 각각 어떤 얼굴로 나타나는지, 12궁 전체를 펴면 전부 드러납니다.
        </p>
        <div className="lockline">🔒 정식 감정서에서 개봉</div>
      </div>

      <p className="whisper" style={{ fontSize: 21 }}>그대의 대운이<br />언제 시작되는지, 다 적혀 있네.</p>

      {/* 대운 — 히어로 훅 회수 */}
      <div className="gcard">
        <h3><span className="gh">運</span> 대운이 바뀌는 해</h3>
        {nd && (
          <p className="fate-year">그대의 다음 대운 — <span className="yr">{nd.startYear}년</span> 시작</p>
        )}
        <p className="blur-tx" aria-hidden="true">
          그 10년의 주제가 무엇인지, 황금기인지 시련기인지, 그 전환기 1~2년을 어떻게 건너야 하는지 — 대한(大限) 연대표는 정식 감정서의 運 편에서 연도별로 다룹니다.
        </p>
        <div className="lockline">🔒 정식 감정서에서 개봉</div>
      </div>

      {/* 재물 */}
      <div className="gcard">
        <h3><span className="gh">財</span> 재물운 — 재백궁의 별</h3>
        <p className="open-tx">그대의 재백궁(財帛宮)에는 <b>{jaebaek.map((s) => s + "성").join("·") || "빌려 쓰는 별"}</b>이 앉아 있습니다.</p>
        <p className="blur-tx" aria-hidden="true">
          이 별이 말하는 돈 버는 방식과 그릇, 돈이 새는 전형적인 경로, 그리고 화록·화기가 재물 라인에 걸렸는지 — 재물이 들어오는 길과 새는 길은 정식 감정서에서 낱낱이 다룹니다.
        </p>
        <div className="lockline">🔒 정식 감정서에서 개봉</div>
      </div>

      {/* 애정 */}
      <div className="gcard">
        <h3><span className="gh">愛</span> 애정운 — 부처궁의 별</h3>
        <p className="open-tx">{firstSentence(spouseText)}</p>
        <p className="blur-tx" aria-hidden="true">
          {spouseText.slice(firstSentence(spouseText).length)} 이 인연을 만나는 시기와 조심할 함정까지.
        </p>
        <div className="lockline">🔒 정식 감정서에서 개봉</div>
      </div>

      {/* 화기 */}
      <div className="gcard">
        <h3><span className="gh">忌</span> 그대의 운을 흔드는 별</h3>
        <p className="blur-tx" aria-hidden="true">
          {giStar ? "그대의 명반에는 화기(化忌)가 붙은 별이 하나 있습니다. 그 별이 어느 궁에 앉아 어떤 영역을 흔드는지, 발동을 다루는 법은..." : "명반에서 기운이 꺾이는 자리가 어디인지, 그 자리를 다루는 법은..."}
        </p>
        <div className="lockline">🔒 정식 감정서에서 개봉</div>
      </div>

      <OfferBar onPay={onPay} />
    </section>
  );
}

function useCountdown() {
  const [left, setLeft] = useState(OFFER.DISCOUNT_HOURS * 3600);
  useEffect(() => {
    let deadline;
    try {
      deadline = Number(localStorage.getItem("jm_deadline"));
      if (!deadline) {
        deadline = Date.now() + OFFER.DISCOUNT_HOURS * 3600 * 1000;
        localStorage.setItem("jm_deadline", String(deadline));
      }
    } catch (e) { deadline = Date.now() + OFFER.DISCOUNT_HOURS * 3600 * 1000; }
    const t = setInterval(() => setLeft(Math.max(0, Math.floor((deadline - Date.now()) / 1000))), 1000);
    return () => clearInterval(t);
  }, []);
  const h = String(Math.floor(left / 3600)).padStart(2, "0");
  const m = String(Math.floor((left % 3600) / 60)).padStart(2, "0");
  const s = String(left % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function OfferBar({ onPay }) {
  const time = useCountdown();
  return (
    <div className="offer-wrap">
      <div className="offer-badge">{OFFER.BADGE}</div>
      <div className="offer">
        <div className="timer"><span className="tl">할인 종료까지</span><span className="tv">{time}</span></div>
        <button className="go" onClick={() => { ev("cta_pay_page"); onPay(); }}>{OFFER.CTA} ⟩</button>
      </div>
    </div>
  );
}

// ---------------- 4. 결제 (3단 패키지) + 紅線 ----------------
function Payment({ leadId, leadToken, birthYear, onBack }) {
  const [prodIdx, setProdIdx] = useState(1); // 기본 [인기]
  const [coupon, setCoupon] = useState("");
  const [couponApplied, setCouponApplied] = useState(0);
  const [couponMsg, setCouponMsg] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [claimErr, setClaimErr] = useState("");
  const [paidClicked, setPaidClicked] = useState(false);
  const [depositDone, setDepositDone] = useState(false);
  const [copied, setCopied] = useState("");
  const [intro, setIntro] = useState("");
  const [avatar, setAvatar] = useState(null);
  const [job, setJob] = useState("");
  const [region, setRegion] = useState("");
  const [ints, setInts] = useState([]);
  const [matchDone, setMatchDone] = useState(false);
  useEffect(() => { ev("pay_view"); }, []);

  const P = PRODUCTS[prodIdx];
  const price = Math.max(0, P.price - couponApplied);
  const discount = P.original - P.price;
  const pct = Math.round((discount / P.original) * 100);
  const payUrl = P.url || CONFIG.PAYMENT_URL;

  const age = birthYear ? new Date().getFullYear() - birthYear : null;
  const adult = age == null || age >= 19;
  const orderCode = leadToken ? leadToken.slice(0, 6).toUpperCase() : null;

  const selectProduct = (i) => {
    setProdIdx(i);
    ev("product_select", { tier: PRODUCTS[i].id });
    if (leadId) {
      try {
        fetch("/api/lead", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: leadId, quizHits: PRODUCTS[i].id }) });
      } catch (e) {}
    }
  };

  const applyCoupon = () => {
    const code = coupon.trim().toUpperCase();
    const amount = CONFIG.COUPONS[code];
    if (amount) { setCouponApplied(amount); setCouponMsg(`쿠폰 적용 — ${amount.toLocaleString("ko-KR")}원 차감`); ev("coupon_ok"); }
    else { setCouponApplied(0); setCouponMsg("유효하지 않은 코드일세."); }
  };

  const isFree = couponApplied > 0 && price === 0;
  const claimFree = async () => {
    if (!leadId || claiming) return;
    setClaiming(true); setClaimErr("");
    ev("free_claim", { tier: P.id });
    try {
      const res = await fetch("/api/claim", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ leadId, coupon: coupon.trim() }),
      });
      const d = await res.json();
      if (!res.ok || !d.token) throw new Error(d.error || "발급 실패");
      window.location.href = `/r/${d.token}`;
    } catch (e) {
      setClaiming(false);
      setClaimErr(e.message || "발급 중 오류가 났어요. 잠시 후 다시 시도해주세요.");
    }
  };

  const copyText = (text, label) => {
    try { navigator.clipboard.writeText(text); setCopied(label); setTimeout(() => setCopied(""), 2000); } catch (e) {}
  };
  const kakaoMsg = `${P.name} 결제 완료했습니다.${orderCode ? ` 주문코드 ${orderCode}` : ""}`;

  const toggleInt = (t) => setInts((xs) => (xs.includes(t) ? xs.filter((x) => x !== t) : xs.length < 5 ? [...xs, t] : xs));
  const canApply = avatar && intro.trim().length >= 10;
  const applyMatch = async () => {
    if (!canApply) return;
    ev("match_apply");
    try {
      await fetch("/api/lead", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: leadId,
          intro: intro.trim().slice(0, 500),
          matchOptin: true,
          profile: { avatar, job: job.trim().slice(0, 20), region: region.trim().slice(0, 20), interests: ints },
        }),
      });
    } catch (e) {}
    setMatchDone(true);
  };

  return (
    <section className="pay">
      <div className="stars" />
      {onBack && <button className="back-btn" style={{ position: "relative", marginBottom: 6 }} onClick={onBack} aria-label="감정 결과로">‹ 감정 결과로</button>}

      <div className="paycard">
        <div className="ph"><span className="eyebrow">{CONFIG.BRAND_HANJA}</span><b>자미두수 정밀 감정서</b></div>

        {/* 상품 3단 */}
        <div className="prod-list">
          {PRODUCTS.map((p, i) => (
            <button key={p.id} className={"prod" + (prodIdx === i ? " on" : "")} onClick={() => selectProduct(i)}>
              {p.hot && <span className="prod-hot">인기</span>}
              <span className="prod-radio" aria-hidden="true" />
              <span className="prod-name">{p.name}</span>
              <span className="prod-desc">{p.desc}</span>
              <span className="prod-price">
                <s>{p.original.toLocaleString("ko-KR")}원</s>
                <b className="prod-pct">-{Math.round(((p.original - p.price) / p.original) * 100)}%</b>
                <b>{p.price.toLocaleString("ko-KR")}원</b>
              </span>
              <span className="prod-items">{p.items.join(" · ")}</span>
            </button>
          ))}
        </div>

        {/* 쿠폰 */}
        <div className="coupon-row">
          <input placeholder="쿠폰 · 추천 코드 입력" value={coupon} onChange={(e) => setCoupon(e.target.value)} />
          <button onClick={applyCoupon}>적용</button>
        </div>
        {couponMsg && <p className="coupon-msg">{couponMsg}</p>}

        {/* 가격 스택 */}
        <div className="prices">
          <div className="pr"><span>{P.name}</span><span className="strike">{P.original.toLocaleString("ko-KR")}원</span></div>
          <p style={{ fontSize: 10.5, color: "var(--tx-dim)", padding: "0 2px" }} className="mono">표시 가격은 오픈 기념 프로모션가입니다</p>
          <div className="pr red"><span>지금 결제 시 할인</span><span>-{discount.toLocaleString("ko-KR")}원</span></div>
          {couponApplied > 0 && <div className="pr red"><span>쿠폰 할인</span><span>-{couponApplied.toLocaleString("ko-KR")}원</span></div>}
          <div className="pr final"><span>최종 결제금액</span><span><span className="pct">-{pct}%</span>{price.toLocaleString("ko-KR")}원</span></div>
        </div>

        {isFree ? (
          <button className="paybtn" onClick={claimFree} disabled={claiming} style={{ border: "none", cursor: claiming ? "wait" : "pointer", opacity: claiming ? 0.75 : 1 }}>
            {claiming ? "월하노인이 명반을 읽는 중… (30초~1분)" : "0원 — 감정서 바로 받기"}
          </button>
        ) : (
        <div style={{ display: "grid", gap: 8 }}>
          <a
            className="paybtn"
            style={{ textDecoration: "none", background: "linear-gradient(135deg,#3182f6,#1b64da)" }}
            href={tossLink(price)}
            onClick={() => { ev("pay_click", { tier: P.id, method: "toss" }); setPaidClicked(true); }}
          >
            토스로 3초 결제 — 계좌·금액 자동 입력
          </a>
          <button
            className="paybtn"
            style={{ border: "1px solid rgba(196,176,255,.4)", cursor: "pointer", background: "transparent", color: "var(--tx)" }}
            onClick={() => { ev("pay_click", { tier: P.id, method: "bank" }); setPaidClicked(true); }}
          >
            무통장입금으로 결제
          </button>
        </div>
        )}
        {claiming && <ReadingShow />}
        {claimErr && (
          <p className="mono" style={{ fontSize: 10.5, color: "#ff8b98", textAlign: "center", marginTop: 8 }}>{claimErr}</p>
        )}

        {paidClicked && (
          <div className="after-pay">
            <p className="ap-t">입금 정보</p>
            <button className="ap-copy" onClick={() => copyText(BANK.ACCOUNT.replace(/[^0-9]/g, ""), "계좌")}>
              {BANK.NAME} {BANK.ACCOUNT} · {BANK.HOLDER} {copied === "계좌" ? "✓ 복사됨" : "⧉ 계좌번호 복사"}
            </button>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "8px 2px 2px" }}>
              <span style={{ color: "var(--tx-dim)" }}>입금 금액</span><b>{price.toLocaleString("ko-KR")}원</b>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 2px 10px", borderBottom: "1px solid rgba(196,176,255,.18)" }}>
              <span style={{ color: "var(--tx-dim)" }}>입금자명</span><b>{form.name.trim() || "문답에 적으신 성함"}{orderCode ? ` 또는 ${orderCode}` : ""}</b>
            </div>

            <p className="ap-t" style={{ marginTop: 14 }}>이후 절차 — 그대는 입금만 하면 되네</p>
            <div className="ap-step"><span>①</span> 입금 — 위 계좌로 (토스 결제도 같은 계좌로 들어오네)</div>
            <div className="ap-step"><span>②</span> 확인 — 시스템이 입금 내역을 순차 대조하네 (영업시간 기준 1시간 이내)</div>
            <div className="ap-step"><span>③</span> 문자 — 남기신 번호 {form.phone ? form.phone.replace(/(\d{3})(\d{3,4})(\d{4})/, "$1-$2-$3") : ""}로 감정서 링크가 자동 발송되네</div>

            {!depositDone ? (
              <button className="paybtn" style={{ border: "none", cursor: "pointer", marginTop: 10, fontSize: 15 }}
                onClick={() => { ev("deposit_done_click", { tier: P.id }); setDepositDone(true); }}>
                입금을 완료했어요
              </button>
            ) : (
              <p style={{ textAlign: "center", fontSize: 13.5, color: "var(--amethyst-hi)", marginTop: 12 }}>
                접수되었네. 확인되는 대로 문자를 보낼 테니, 이제 문자만 기다리시게.
              </p>
            )}
            <p className="mono" style={{ fontSize: 10, color: "var(--tx-dim)", marginTop: 10, lineHeight: 1.7 }}>
              {LEGAL.REFUND}<br />링크 문자를 잃어버리면 그 문자에 회신 — 다시 보내드리네.
            </p>
          </div>
        )}


        {!paidClicked && (
          <>
            <p className="delivery">
              {CONFIG.DELIVERY_NOTE}
              {orderCode && <><br />내 주문코드: <button className="code-chip" onClick={() => copyText(orderCode, "주문코드")}>{orderCode} {copied === "주문코드" ? "✓" : "⧉"}</button></>}
            </p>
            <p className="mono" style={{ fontSize: 11, color: "var(--tx-dim)", textAlign: "center" }}>
              입금이 확인되면 문답에 남기신 번호로 감정서 링크를 문자로 보내드리네.
            </p>
          </>
        )}

        <div className="trust">
          {TRUST.map((t) => <p key={t}>✓ {t}</p>)}
          <p>✓ 수신 후 24시간 내 요청 시 전액 환불</p>
        </div>
      </div>



      <p className="fine">
        결제 정보를 확인했으며 <a href="/privacy" target="_blank">개인정보 수집 및 이용</a>, 환불 정책에 동의합니다.
        본 콘텐츠는 명리학 이론 기반 참고용이며 인생의 결정에 대한 유일한 근거가 될 수 없습니다.
      </p>
      <SiteFooter />
    </section>
  );
}
