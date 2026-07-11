"use client";
// ============================================================
// 자미연 퍼널: 히어로 → 월하노인 문답 → 무료 감정+봉인 → 결제+紅線매칭
// ============================================================
import { useState, useMemo, useRef, useEffect } from "react";
import { computeZiwei, fateYears, JI, STAR_HANJA } from "../lib/ziwei";
import { CONFIG, ELDER, OFFER, TRUST, REPORT_ITEMS, MATCHING, TIME_SLOTS, STAR_SELF, STAR_SPOUSE, STAR_TAG, EMPTY_SPOUSE, SOCIAL_PROOF, AVATARS, INTERESTS, MATCH_UI } from "../lib/content";
import { track } from "@vercel/analytics";

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

// UTM 캡처 (첫 방문 시 저장 → 리드에 첨부: 어떤 광고 소재가 결제를 냈는지 측정)
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

const INPUT_STEPS = ["gender", "birth", "time", "phone", "name"];

export default function Home() {
  const [step, setStep] = useState("intro");
  const [form, setForm] = useState({
    gender: null, cal: "solar", leap: false,
    y: null, m: null, d: null, slot: null, timeUnknown: false,
    phone: "", name: "", consent: false,
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
        setForm((prev) => ({ ...prev, ...saved, consent: false })); // 동의는 매번 새로
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    // 입력 진행상황 자동 저장 — 이탈 후 재방문 시 이어서
    try {
      const { consent, ...rest } = form;
      localStorage.setItem("jm_form", JSON.stringify(rest));
    } catch (e) {}
  }, [form]);

  // 지난 감정 이어보기 (리드 재저장 없이 재계산만)
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

  const goto = (s) => {
    setStep(s);
    ev("step_" + s);
    setTimeout(() => topRef.current?.scrollIntoView({ behavior: "auto" }), 20);
  };

  const startFunnel = () => {
    import("korean-lunar-calendar").catch(() => {}); // 미리 받아둠 — 제출 순간 지연 제거
    goto("gender");
  };

  const submitAll = async () => {
    // 1) 양력 확정
    let sy = form.y, sm = form.m, sd = form.d;
    let mod;
    try {
      mod = await import("korean-lunar-calendar");
    } catch (e) { alert("달력 모듈 로드 실패 — 새로고침 후 다시 시도해주세요."); return; }
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
    // 2) 음력 확정 (자미두수는 음력 기준)
    const c2 = new KLC();
    if (!c2.setSolarDate(sy, sm, sd)) {
      alert("지원하지 않는 날짜입니다.");
      goto("birth"); return;
    }
    const lun = c2.getLunarCalendar();

    // 3) 명반 계산
    const z = computeZiwei({
      lunarYear: lun.year, lunarMonth: lun.month, lunarDay: lun.day,
      hourBranch: form.slot,
      gender: form.gender,
      solarYear: sy, solarMonth: sm, solarDay: sd,
    });
    setZiwei(z);
    goto("checking");

    // 재방문 이어보기용 스냅샷
    try {
      localStorage.setItem("jm_last", JSON.stringify({ y: sy, m: sm, d: sd, slot: form.slot, gender: form.gender, name: form.name.trim() }));
    } catch (e) {}

    // 4) 디비 저장
    try {
      const buche = z.palaceAt("부처궁");
      const eff = z.effectiveMajors(buche);
      const fy = fateYears(z, sy, 1);
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.replace(/[^0-9]/g, ""),
          birth: { y: sy, m: sm, d: sd, slotIdx: form.slot, slot: form.timeUnknown ? "미상(오시 추정)" : TIME_SLOTS[form.slot].label, gender: form.gender, cal: form.cal, leap: form.leap, utm: captureUtm() },
          salNames: [
            `명궁:${z.palaceAt("명궁").majors.join("·") || "차성"}`,
            `부처궁:${eff.stars.join("·")}${eff.borrowed ? "(차성)" : ""}`,
            fy.length ? `인연해:${fy[0]}` : "",
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
      ev("lead_submitted", { saved: !!data.id });
    } catch (e) { ev("lead_submitted", { saved: false }); }
    setTimeout(() => goto("diag"), 2200);
  };

  return (
    <main className="phone">
      <div ref={topRef} />
      {step === "intro" && <Intro onStart={startFunnel} onResume={lastSnap ? resume : null} />}
      {INPUT_STEPS.includes(step) && (
        <ElderFlow step={step} form={form} setForm={setForm} goto={goto} onSubmit={submitAll} />
      )}
      {step === "checking" && <Checking />}
      {step === "diag" && ziwei && <Diagnosis z={ziwei} name={form.name} timeUnknown={form.timeUnknown} onPay={() => goto("pay")} />}
      {step === "pay" && ziwei && <Payment leadId={leadId} leadToken={leadToken} birthYear={ziwei.input.solarYear} onBack={() => goto("diag")} />}
    </main>
  );
}

// ---------------- 사이트 푸터 (문의·표기) ----------------
function SiteFooter() {
  return (
    <footer style={{ position: "relative", zIndex: 2 }}>
      <p>
        {CONFIG.BRAND}({CONFIG.BRAND_HANJA}) · 문의: <a href={CONFIG.KAKAO_CHANNEL_URL} target="_blank" rel="noopener noreferrer" style={{ color: "var(--tx-dim)" }}>카카오톡 채널</a> · <a href="/privacy" style={{ color: "var(--tx-dim)" }}>개인정보처리방침</a>
        {CONFIG.BUSINESS_INFO && <><br />{CONFIG.BUSINESS_INFO}</>}
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

// ---------------- 0. 히어로 ----------------
function Intro({ onStart, onResume }) {
  return (
    <section className="hero">
      <div className="stars" /><div className="stars2" />
      <div className="moon" aria-hidden="true" />

      <div className="hero-top">
        <span className="logo">{CONFIG.BRAND_HANJA}</span>
        <span className="line" aria-hidden="true" />
        <span className="eyebrow">{CONFIG.CLAIM}</span>
      </div>

      <svg className="thread" viewBox="0 0 430 780" preserveAspectRatio="none" aria-hidden="true">
        <path d="M 352 128 C 300 240, 120 300, 150 420 S 330 560, 215 690" />
      </svg>
      <div className="knot" style={{ right: "16%", top: "14.5%" }} aria-hidden="true" />

      <div className="hero-copy">
        <span className="eyebrow">月下老人이 감정합니다</span>
        <h1 className="hook">
          내 <span className="fate">운명의 짝</span>은<br />
          202<span className="veil" aria-hidden="true">7</span>년에 나타납니다.
        </h1>
        <p className="hero-sub">
          천 년 동안 황실이 혼인을 정한 <b>자미두수 부처궁(夫妻宮)</b> —<br />
          당신의 짝은 이미 명반에 적혀 있습니다.
        </p>
      </div>

      <Mountains />

      <div className="hero-cta-zone">
        {SOCIAL_PROOF.enabled && (
          <div className="social-pill"><span className="ht">🧵</span> <b>{SOCIAL_PROOF.buyers}명</b>이 붉은 실을 확인했어요</div>
        )}
        <button className="cta" onClick={() => { ev("cta_start"); onStart(); }}>
          내 운명의 짝 확인하기
          <small>무료 감정 · 회원가입 없음 · 3분</small>
        </button>
        {onResume && (
          <button className="resume-chip" onClick={onResume}>지난 감정 다시 보기 →</button>
        )}
      </div>
    </section>
  );
}

// ---------------- 1. 월하노인 문답 ----------------
function ElderFlow({ step, form, setForm, goto, onSubmit }) {
  const idx = INPUT_STEPS.indexOf(step);
  const next = () => goto(INPUT_STEPS[idx + 1]);
  const back = () => goto(idx === 0 ? "intro" : INPUT_STEPS[idx - 1]);
  const NUM = { gender: "問 一", birth: "問 二", time: "問 三", phone: "問 四", name: "問 五" };
  const MARK = { gender: "緣", birth: "生", time: "時", phone: "絡", name: "名" };
  const E = ELDER[step];

  const rows = [];
  if (form.name && step !== "name") rows.push({ k: "이름", v: form.name, s: "name" });
  if (form.phone && idx > INPUT_STEPS.indexOf("phone")) rows.push({ k: "연락처", v: form.phone, s: "phone" });
  if (form.slot != null && idx > INPUT_STEPS.indexOf("time")) rows.push({ k: "생시", v: form.timeUnknown ? "미상(오시 추정)" : TIME_SLOTS[form.slot].label, s: "time" });
  if (form.y && idx > INPUT_STEPS.indexOf("birth")) rows.push({ k: "생년월일", v: `${form.y}년 ${form.m}월 ${form.d}일 (${form.cal === "solar" ? "양력" : "음력"})`, s: "birth" });
  if (form.gender && idx > INPUT_STEPS.indexOf("gender")) rows.push({ k: "그대는", v: form.gender === "M" ? "남자" : "여자", s: "gender" });

  return (
    <section className="ask">
      <div className="stars" />
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
          {step === "name" && <NameInput form={form} setForm={setForm} onDone={onSubmit} />}
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
          <button className="sheet-btn" onClick={() => { setForm({ ...form, gender: "M" }); ev("gender_set"); next(); }}>남자입니다</button>
          <button className="sheet-btn" onClick={() => { setForm({ ...form, gender: "F" }); ev("gender_set"); next(); }}>여자입니다</button>
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
      <input
        className="field"
        inputMode="numeric"
        placeholder="0000년 00월 00일"
        value={disp}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && commit()}
        autoFocus
      />
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
    <div className="slot-grid">
      {TIME_SLOTS.map((s, i) => (
        <button key={s.label} className={"slot-btn" + (form.slot === i ? " on" : "")}
          onClick={() => { setForm({ ...form, slot: i }); ev("time_set"); onDone(); }}>
          {s.label}
        </button>
      ))}
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
      <button className="go-cta" disabled={!valid} onClick={() => { ev("name_set"); onDone(); }}>
        내 붉은 실 확인하기 ›
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

// ---------------- 3. 무료 감정 + 봉인 ----------------
function firstSentence(text) {
  const m = text.match(/^.*?다\./);
  return m ? m[0] : text.slice(0, 45);
}

function Diagnosis({ z, name, timeUnknown, onPay }) {
  const buche = z.palaceAt("부처궁");
  const eff = z.effectiveMajors(buche);
  const mainStar = eff.stars[0];
  const spouseText = mainStar ? STAR_SPOUSE[mainStar] : EMPTY_SPOUSE;
  const fy = useMemo(() => fateYears(z, z.input.solarYear, 3), [z]);
  const giStar = Object.entries(z.sahwa).find(([, k]) => k === "기")?.[0];
  useEffect(() => { ev("diag_view", { star: mainStar || "공궁", borrowed: eff.borrowed }); }, []); // eslint-disable-line

  return (
    <section className="diag">
      <div className="stars" />

      <p className="whisper">{name ? `${name}...` : "허어..."}<br />실이 팽팽하게 당겨져 있군.</p>
      {timeUnknown && (
        <p className="tu-note">※ 시진 미상 — 정오(午時) 기준 추정 명반일세. 태어난 시를 확인해 오면 카카오톡으로 다시 봐줌세.</p>
      )}

      {/* 부처궁 공개 */}
      <div className="gcard">
        <h3><span className="gh">緣</span> 그대의 부처궁(夫妻宮)에 앉은 별</h3>
        <div className="star-reveal">
          <div className="star-hanja" style={eff.stars.length > 1 ? { fontSize: 52 } : {}}>
            {eff.stars.map((s) => STAR_HANJA[s]).join("·") || "空"}
          </div>
          <div className="star-name">{eff.stars.map((s) => s + "성").join(" · ") || "공궁(空宮)"}{eff.borrowed && eff.stars.length > 0 ? " — 차성(借星)" : ""}</div>
          {mainStar && <div className="star-tag">{STAR_TAG[mainStar]}</div>}
        </div>
        <p className="open-tx">{firstSentence(spouseText).replace(/^그대의 짝은/, "그대의 짝은 ")}</p>
        <p className="blur-tx" aria-hidden="true">
          {spouseText.slice(firstSentence(spouseText).length)} 이 짝을 만나게 되는 경로와 첫 만남에서 그대가 느낄 감정, 서로를 알아보는 신호, 그리고 이 인연이 깊어지는 조건까지 — 명반에는 전부 적혀 있습니다.
        </p>
        <div className="lockline">🔒 정식 감정서에서 개봉</div>
      </div>

      {/* 명궁 한 줄 (무료 신뢰 적립) */}
      {z.palaceAt("명궁").majors[0] && (
        <div className="gcard">
          <h3><span className="gh">命</span> 그대라는 사람 — {z.palaceAt("명궁").majors.map((s) => s + "성").join("·")}</h3>
          <p className="open-tx">{firstSentence(STAR_SELF[z.palaceAt("명궁").majors[0]])}</p>
          <p className="blur-tx" aria-hidden="true">{STAR_SELF[z.palaceAt("명궁").majors[0]].slice(firstSentence(STAR_SELF[z.palaceAt("명궁").majors[0]]).length)} 그대가 사랑에서 반복하는 패턴과 그 이유는...</p>
          <div className="lockline">🔒 정식 감정서에서 개봉</div>
        </div>
      )}

      <p className="whisper" style={{ fontSize: 21 }}>다만...<br />때를 모르면 스쳐 지나가네.</p>

      {/* 인연의 해 */}
      <div className="gcard">
        <h3><span className="gh">時</span> 붉은 실이 당겨지는 해</h3>
        {fy.length > 0 && (
          <p className="fate-year">가장 가까운 인연의 해 — <span className="yr">{fy[0]}년</span></p>
        )}
        <p className="blur-tx" aria-hidden="true">
          그 해에 인연이 들어오는 경로와 계절, 그대가 반드시 준비해 두어야 할 것 한 가지.
          {z.marriageDaehan ? " 그리고 그대의 대한(大限)이 부처궁 자리에 드는 10년의 창이 언제 열리는지." : ""} 그 창을 놓치면 다음 실이 당겨지는 해는{fy[1] ? "..." : " 한참을 기다려야 하니..."}
        </p>
        <div className="lockline">🔒 정식 감정서에서 개봉</div>
      </div>

      {/* 피해야 할 상대 */}
      <div className="gcard">
        <h3><span className="gh">選</span> 그대가 피해야 할 상대</h3>
        <p className="blur-tx" aria-hidden="true">
          그대의 명궁 구조상 본능적으로 끌리지만 반복되면 소모되는 유형이 뚜렷하게 하나 있습니다.
          {giStar ? ` 그리고 그대의 명반에는 화기(化忌)가 붙은 별이 하나 있어 — 그 별이 관계에서 만드는 함정은...` : " 그 사람의 첫인상은 오히려..."}
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

// ---------------- 4. 결제 + 紅線 매칭 ----------------
function Payment({ leadId, leadToken, birthYear, onBack }) {
  const price = CONFIG.PRICE, orig = CONFIG.PRICE_ORIGINAL;
  const discount = orig - price;
  const pct = Math.round((discount / orig) * 100);
  const [intro, setIntro] = useState("");
  const [avatar, setAvatar] = useState(null);
  const [job, setJob] = useState("");
  const [region, setRegion] = useState("");
  const [ints, setInts] = useState([]);
  const [matchDone, setMatchDone] = useState(false);
  useEffect(() => { ev("pay_view"); }, []);

  const toggleInt = (t) =>
    setInts((xs) => (xs.includes(t) ? xs.filter((x) => x !== t) : xs.length < 5 ? [...xs, t] : xs));

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

  const age = birthYear ? new Date().getFullYear() - birthYear : null;
  const adult = age == null || age >= 19;
  const orderCode = leadToken ? leadToken.slice(0, 6).toUpperCase() : null;
  const [paidClicked, setPaidClicked] = useState(false);
  const [copied, setCopied] = useState("");

  const copyText = (text, label) => {
    try { navigator.clipboard.writeText(text); setCopied(label); setTimeout(() => setCopied(""), 2000); } catch (e) {}
  };
  const kakaoMsg = orderCode ? `인연 감정서 결제 완료했습니다. 주문코드 ${orderCode}` : "인연 감정서 결제 완료했습니다.";

  return (
    <section className="pay">
      <div className="stars" />
      {onBack && <button className="back-btn" style={{ position: "relative", marginBottom: 6 }} onClick={onBack} aria-label="감정 결과로">‹ 감정 결과로</button>}
      <div className="paycard">
        <div className="ph"><span className="eyebrow">{CONFIG.BRAND_HANJA}</span><b>운명의 짝 정밀 감정서</b></div>
        <div className="plist">
          {REPORT_ITEMS.map((it) => <p key={it.label}><span className="h">{it.hanja}</span>{it.label}</p>)}
        </div>
        <div className="prices">
          <div className="pr"><span>{CONFIG.BRAND} 정밀 감정서</span><span className="strike">{orig.toLocaleString("ko-KR")}원</span></div>
          <p style={{ fontSize: 10.5, color: "var(--tx-dim)", padding: "0 2px" }} className="mono">표시 가격은 오픈 기념 프로모션가입니다</p>
          <div className="pr red"><span>지금 결제 시 할인</span><span>-{discount.toLocaleString("ko-KR")}원</span></div>
          <div className="pr final"><span>최종 결제금액</span><span><span className="pct">-{pct}%</span>{price.toLocaleString("ko-KR")}원</span></div>
        </div>
        <a className="paybtn" href={CONFIG.PAYMENT_URL} target="_blank" rel="noopener noreferrer" onClick={() => { ev("pay_click"); setPaidClicked(true); }}>
          결제하기
        </a>

        {paidClicked && (
          <div className="after-pay">
            <p className="ap-t">결제를 마치셨다면 — 감정서 받는 길</p>
            <div className="ap-step"><span>①</span> 아래 안내문을 복사하고</div>
            <button className="ap-copy" onClick={() => copyText(kakaoMsg, "안내문")}>
              “{kakaoMsg}” {copied === "안내문" ? "✓ 복사됨" : "— 눌러서 복사"}
            </button>
            <div className="ap-step"><span>②</span> 카카오톡 채널을 추가해 붙여넣으시게</div>
            <a className="kakao" style={{ marginTop: 6 }} href={CONFIG.KAKAO_CHANNEL_URL} target="_blank" rel="noopener noreferrer" onClick={() => ev("kakao_click")}>
              카카오톡 채널 열기
            </a>
            <div className="ap-step"><span>③</span> 24시간 내 전용 감정서 링크가 도착하네</div>
          </div>
        )}
        {!paidClicked && (
          <>
            <p className="delivery">
              {CONFIG.DELIVERY_NOTE}
              {orderCode && <><br />내 주문코드: <button className="code-chip" onClick={() => copyText(orderCode, "주문코드")}>{orderCode} {copied === "주문코드" ? "✓" : "⧉"}</button></>}
            </p>
            <a className="kakao" href={CONFIG.KAKAO_CHANNEL_URL} target="_blank" rel="noopener noreferrer" onClick={() => ev("kakao_click")}>
              카카오톡 채널 추가하기
            </a>
          </>
        )}
        <div className="trust">
          {TRUST.map((t) => <p key={t}>✓ {t}</p>)}
          <p>✓ 수신 후 24시간 내 요청 시 전액 환불</p>
        </div>
      </div>

      <div className="match">
        <h3><span className="h">紅線</span> {MATCHING.TITLE.replace("紅線 ", "")}</h3>
        {!adult && (
          <p className="mf-label" style={{ marginTop: 8 }}>紅線 매칭은 만 19세 이상만 신청할 수 있네. 연이 급할수록 때를 기다리는 법일세.</p>
        )}
        <p className="desc">{MATCHING.DESC}</p>
        <ul>{MATCHING.POINTS.map((p) => <li key={p}>{p}</li>)}</ul>

        {adult && !matchDone ? (
          <div className="mform">
            <p className="mf-label">{MATCH_UI.FORM_NOTE}</p>
            <p className="mf-t">가면(아바타)을 고르시게</p>
            <div className="avatar-grid">
              {AVATARS.map((a) => (
                <button key={a} className={"av" + (avatar === a ? " on" : "")} onClick={() => setAvatar(a)}>{a}</button>
              ))}
            </div>
            <div className="mf-row">
              <input placeholder="직업 (예: 대학생, 간호사)" value={job} onChange={(e) => setJob(e.target.value)} />
              <input placeholder="지역 (예: 서울 마포)" value={region} onChange={(e) => setRegion(e.target.value)} />
            </div>
            <p className="mf-t">관심사 (최대 5개)</p>
            <div className="int-grid">
              {INTERESTS.map((t) => (
                <button key={t} className={"chip" + (ints.includes(t) ? " on" : "")} onClick={() => toggleInt(t)}>{t}</button>
              ))}
            </div>
            <textarea className="ta" placeholder="나를 소개하는 세 문장 (익명 · 10자 이상)" value={intro} onChange={(e) => setIntro(e.target.value)} />
            <button className="mbtn" disabled={!canApply} onClick={applyMatch}>{MATCHING.CTA}</button>
          </div>
        ) : adult ? (
          <div className="mdone-box">
            <p className="mdone">{MATCHING.DONE}</p>
            {leadToken && (
              <>
                <a className="mbox-link" href={`/m/${leadToken}`}>
                  내 인연함 열어보기 →
                  <small>연이 도착하면 이 곳에 카드가 옵니다. 링크를 저장해두시게.</small>
                </a>
                <p className="mf-label" style={{ marginTop: 10, textAlign: "center" }}>
                  링크를 잃어버리면 카카오톡 채널에 “인연함”이라고 보내주시게 — 다시 찾아줌세.
                </p>
              </>
            )}
          </div>
        ) : null}
      </div>

      <p className="fine">
        결제 정보를 확인했으며 <a href="/privacy" target="_blank">개인정보 수집 및 이용</a>, 환불 정책에 동의합니다.
        본 콘텐츠는 명리학 이론 기반 참고용이며 인생의 결정에 대한 유일한 근거가 될 수 없습니다.
      </p>
      <SiteFooter />
    </section>
  );
}
