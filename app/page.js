"use client";
// ============================================================
// 명문서당 퍼널: 영상 씬 → 훈장님 문답(성별→생일→생시→연락처→이름)
//               → 재능 등급 진단(무료) + 공부살 잠금 → 결제
// ============================================================
import { useState, useMemo, useRef, useEffect } from "react";
import { computeSaju } from "../lib/engine";
import { talentProfile, schoolRoadmap } from "../lib/insights";
import { CONFIG, TEACHER, OFFER, SOCIAL_PROOF, TRUST, REPORT_ITEMS, UPSELL, TIME_SLOTS } from "../lib/content";
import { track } from "@vercel/analytics";

function ev(name, data) {
  try { track(name, data || {}); } catch (e) {}
}

const INPUT_STEPS = ["gender", "birth", "time", "phone", "name"];

export default function Home() {
  const [step, setStep] = useState("intro");
  const [form, setForm] = useState({
    gender: null, cal: "solar", leap: false,
    y: null, m: null, d: null,
    slot: null,
    phone: "", name: "", consent: false,
  });
  const [saju, setSaju] = useState(null);
  const topRef = useRef(null);

  const goto = (s) => {
    setStep(s);
    ev("step_" + s);
    setTimeout(() => topRef.current?.scrollIntoView({ behavior: "auto" }), 20);
  };

  const submitAll = async () => {
    let sy = form.y, sm = form.m, sd = form.d;
    if (form.cal === "lunar") {
      try {
        const mod = await import("korean-lunar-calendar");
        const KLC = mod.default || mod;
        const c = new KLC();
        if (!c.setLunarDate(form.y, form.m, form.d, form.leap)) throw new Error();
        const s = c.getSolarCalendar();
        sy = s.year; sm = s.month; sd = s.day;
      } catch (e) {
        alert("음력 날짜를 변환할 수 없습니다. 날짜를 확인해주세요.");
        goto("birth");
        return;
      }
    }
    const slot = TIME_SLOTS[form.slot ?? 0];
    const result = computeSaju({
      y: sy, m: sm, d: sd,
      hour: slot.hour, minute: slot.minute || 0,
      gender: form.gender, lon: null,
    });
    setSaju(result);
    goto("checking");

    try {
      const tp = talentProfile(result);
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.replace(/[^0-9]/g, ""),
          birth: { y: sy, m: sm, d: sd, hour: slot.hour, minute: slot.minute || 0, gender: form.gender, region: "미상", cal: form.cal, leap: form.leap, slot: slot.label },
          salNames: tp.blockers.map((b) => b.name),
          salCount: tp.blockers.length,
        }),
      });
      const data = await res.json();
      ev("lead_submitted", { saved: !!data.id });
    } catch (e) {
      ev("lead_submitted", { saved: false });
    }
    setTimeout(() => goto("diag"), 2200);
  };

  return (
    <main>
      <div ref={topRef} />
      {step === "intro" && <Intro onStart={() => goto("gender")} />}
      {INPUT_STEPS.includes(step) && (
        <TeacherFlow step={step} form={form} setForm={setForm} goto={goto} onSubmit={submitAll} />
      )}
      {step === "checking" && <Checking />}
      {step === "diag" && saju && <Diagnosis saju={saju} name={form.name} onPay={() => goto("pay")} />}
      {step === "pay" && saju && <Payment />}
    </main>
  );
}

// ---------------- 0. 영상 씬 ----------------
function Intro({ onStart }) {
  const [videoOk, setVideoOk] = useState(true);
  return (
    <section className="intro-full">
      {videoOk && (
        <video className="intro-video" autoPlay muted loop playsInline poster="/intro.jpg" onError={() => setVideoOk(false)}>
          <source src="/intro.mp4" type="video/mp4" />
        </video>
      )}
      {!videoOk && <div className="intro-fallback" aria-hidden="true" />}
      <div className="intro-vignette" aria-hidden="true" />

      <div className="intro-content">
        <div className="eyebrow">{CONFIG.BRAND_HANJA} · {CONFIG.CLAIM}</div>
        <h1 className="intro-hook">
          {CONFIG.HOOK.split("\n").map((l, i) => <span key={i}>{l}<br /></span>)}
        </h1>
        <p className="intro-sub">{CONFIG.TAGLINE}</p>
      </div>

      <div className="intro-cta-bar">
        <button className="intro-cta" onClick={() => { ev("cta_start"); onStart(); }}>
          <span className="cta-seal" aria-hidden="true">書</span>
          <span className="cta-label">우리 아이 재능 확인하기</span>
          <span className="cta-seal" aria-hidden="true">堂</span>
        </button>
        <p className="intro-cta-note">무료 진단 · 3분 · 생년월일시만 있으면 됩니다</p>
      </div>
    </section>
  );
}

// ---------------- 1. 훈장님 문답 ----------------
function TeacherFlow({ step, form, setForm, goto, onSubmit }) {
  const idx = INPUT_STEPS.indexOf(step);
  const next = () => goto(INPUT_STEPS[idx + 1]);

  const rows = [];
  if (form.name && step !== "name") rows.push({ k: "아이 이름", v: form.name, s: "name" });
  if (form.phone && idx > INPUT_STEPS.indexOf("phone")) rows.push({ k: "연락처", v: form.phone, s: "phone" });
  if (form.slot != null && idx > INPUT_STEPS.indexOf("time")) rows.push({ k: "생시", v: TIME_SLOTS[form.slot].label, s: "time" });
  if (form.y && idx > INPUT_STEPS.indexOf("birth")) rows.push({ k: "생년월일", v: `${form.y}년 ${form.m}월 ${form.d}일 (${form.cal === "solar" ? "양력" : "음력"})`, s: "birth" });
  if (form.gender && idx > INPUT_STEPS.indexOf("gender")) rows.push({ k: "성별", v: form.gender === "M" ? "아들" : "딸", s: "gender" });

  const T = TEACHER[step];

  return (
    <section className="seodang-stage">
      <div className="sd-head">
        {step === "gender" && <p className="sd-say">{TEACHER.intro.split("\n").map((l, i) => <span key={i}>{l}<br /></span>)}</p>}
        {step !== "gender" && (
          <>
            <h2 className="sd-q">{T.q}</h2>
            {T.sub && <p className="sd-sub">{T.sub}</p>}
          </>
        )}
      </div>

      <div className="sd-input">
        {step === "birth" && <BirthInput form={form} setForm={setForm} onDone={next} />}
        {step === "time" && <TimeInput form={form} setForm={setForm} onDone={next} />}
        {step === "phone" && <PhoneInput form={form} setForm={setForm} onDone={next} />}
        {step === "name" && <NameInput form={form} setForm={setForm} onDone={onSubmit} />}
      </div>

      {rows.length > 0 && (
        <div className="sd-rows">
          {rows.map((r) => (
            <div className="g-row" key={r.k}>
              <span className="g-k">{r.k}</span>
              <button className="g-v" onClick={() => goto(r.s)}>{r.v} <span className="g-edit">✎</span></button>
            </div>
          ))}
        </div>
      )}

      {/* 훈장님 — 수묵 일원상 (public/teacher.png 넣으면 이미지로 대체) */}
      <div className="teacher-wrap" aria-hidden="true">
        <img src="/teacher.png" alt="" className="teacher-img" onError={(e) => { e.currentTarget.style.display = "none"; }} />
        <div className="ink-circle"><span className="ink-glyph">命</span></div>
      </div>

      {step === "gender" && (
        <div className="gender-sheet">
          <h2 className="sheet-q">{TEACHER.gender.q}</h2>
          <button className="sheet-btn" onClick={() => { setForm({ ...form, gender: "M" }); ev("gender_set"); next(); }}>아들이에요</button>
          <button className="sheet-btn" onClick={() => { setForm({ ...form, gender: "F" }); ev("gender_set"); next(); }}>딸이에요</button>
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
  const valid = (() => {
    if (digits.length !== 8) return false;
    const y = +digits.slice(0, 4), m = +digits.slice(4, 6), d = +digits.slice(6, 8);
    if (y < 1980 || y > new Date().getFullYear()) return false;
    if (m < 1 || m > 12 || d < 1 || d > 31) return false;
    return true;
  })();
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
        className="sd-field"
        inputMode="numeric"
        placeholder="0000년 00월 00일"
        value={disp}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && commit()}
        autoFocus
      />
      {form.cal === "lunar" && (
        <label className="sd-check">
          <input type="checkbox" checked={form.leap} onChange={(e) => setForm({ ...form, leap: e.target.checked })} /> 윤달
        </label>
      )}
      <button className="sd-next" disabled={!valid} onClick={commit}>다음</button>
    </div>
  );
}

function TimeInput({ form, setForm, onDone }) {
  return (
    <div className="slot-grid">
      {TIME_SLOTS.map((s, i) => (
        <button
          key={s.label}
          className={"slot-btn" + (form.slot === i ? " on" : "")}
          onClick={() => { setForm({ ...form, slot: i }); ev("time_set", { known: s.hour != null }); onDone(); }}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}

function PhoneInput({ form, setForm, onDone }) {
  const digits = form.phone.replace(/[^0-9]/g, "");
  const disp = digits.length > 7
    ? `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`
    : digits.length > 3 ? `${digits.slice(0, 3)}-${digits.slice(3)}` : digits;
  const valid = digits.length >= 10;
  const commit = () => { if (valid) { ev("phone_set"); onDone(); } };
  return (
    <div>
      <input
        className="sd-field"
        inputMode="tel"
        placeholder="010-0000-0000"
        value={disp}
        onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/[^0-9]/g, "").slice(0, 11) })}
        onKeyDown={(e) => e.key === "Enter" && commit()}
        autoFocus
      />
      <button className="sd-next" disabled={!valid} onClick={commit}>다음</button>
    </div>
  );
}

function NameInput({ form, setForm, onDone }) {
  const valid = form.name.trim().length >= 1 && form.consent;
  return (
    <div>
      <input
        className="sd-field"
        placeholder="이름 또는 태명"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value.slice(0, 12) })}
        autoFocus
      />
      <label className="sd-check">
        <input type="checkbox" checked={form.consent} onChange={(e) => setForm({ ...form, consent: e.target.checked })} />
        <span><a href="/privacy" target="_blank">개인정보 수집·이용</a> 동의 (풀이 산출·전달 목적)</span>
      </label>
      <button className="sd-cta" disabled={!valid} onClick={() => { ev("name_set"); onDone(); }}>
        타고난 재능 확인하기 <span style={{ marginLeft: 6 }}>›</span>
      </button>
    </div>
  );
}

// ---------------- 2. 확인 중 ----------------
function Checking() {
  return (
    <section className="seodang-stage" style={{ justifyContent: "center", alignItems: "center" }}>
      <p className="sd-say" style={{ fontSize: 24 }}>{TEACHER.checking.split("\n").map((l, i) => <span key={i}>{l}<br /></span>)}</p>
      <div className="teacher-wrap" style={{ position: "relative", left: "auto", top: "auto", transform: "none", marginTop: 30 }} aria-hidden="true">
        <div className="ink-circle spinning"><span className="ink-glyph">命</span></div>
      </div>
    </section>
  );
}

// ---------------- 3. 재능 진단 (무료 + 잠금) ----------------
function firstSentence(text) {
  const m = text.match(/^.*?다\./);
  return m ? m[0] : text.slice(0, 40);
}

function Diagnosis({ saju, name, onPay }) {
  const tp = useMemo(() => talentProfile(saju), [saju]);
  const rm = useMemo(() => schoolRoadmap(saju), [saju]);
  const blockers = tp.blockers;
  const first = blockers[0];
  useEffect(() => { ev("diag_view", { grade: tp.grade.key, blockers: blockers.length }); }, []); // eslint-disable-line

  return (
    <section className="diag">
      <p className="brush-script">{TEACHER.diag1.split("\n").map((l, i) => <span key={i}>{l}<br /></span>)}</p>

      {/* 등급 카드 — 무료 */}
      <div className="grade-card">
        <div className="eyebrow" style={{ marginBottom: 10 }}>{name ? `${name} — ` : ""}타고난 재능 등급</div>
        <div className="grade-hanja">{tp.grade.key}</div>
        <p className="grade-name">{tp.grade.name}</p>
        <p className="grade-line">“{tp.grade.line}”</p>
      </div>

      {/* 재능 유형 — 무료 */}
      <div className="diag-card">
        <h3><span className="dc-hanja">{tp.type.hanja}</span> 재능 유형 — {tp.type.name}</h3>
        <p className="diag-open">{tp.type.desc}</p>
        {tp.stars.length > 0 && (
          <div className="star-box">
            {tp.stars.map((s) => <p key={s.name} className="star-line">◉ {s.desc}</p>)}
          </div>
        )}
      </div>

      <p className="brush-script">{(blockers.length ? TEACHER.diag2 : TEACHER.diag2none).split("\n").map((l, i) => <span key={i}>{l}<br /></span>)}</p>

      {/* 공부살 — 잠금 */}
      {first && (
        <div className="diag-card">
          <h3><span className="dc-hanja">煞</span> 이 아이의 학업을 막는 살 — {blockers.length}개</h3>
          <p className="diag-open">
            그중 하나는 <b>{first.name}살({first.hanja})</b> — {first.short}.
          </p>
          <p className="diag-open">{firstSentence(first.desc)}</p>
          <p className="diag-blur">
            {first.desc.slice(firstSentence(first.desc).length)} 이 살이 크게 발동하기 쉬운 시기는 학령기 중에서도 특정 구간에 몰려 있으며, 그 시기에 부모가 어떻게 대응하느냐에 따라 성적의 궤도가 갈립니다. 구체적인 시기와 지도법은 정식 리포트에서 낱낱이 다룹니다.
          </p>
        </div>
      )}
      {blockers.length > 1 && (
        <div className="diag-card">
          <h3><span className="dc-hanja">封</span> 아직 열지 않은 살 — {blockers.length - 1}개</h3>
          <p className="diag-blur">
            {blockers.slice(1).map((b) => `${b.name}살(${b.hanja}) — ${b.short}. ${b.desc}`).join(" ")}
          </p>
        </div>
      )}

      {/* 결정적 시기 — 잠금 (수능 해 티저) */}
      <div className="diag-card">
        <h3><span className="dc-hanja">曆</span> 결정적 시기</h3>
        <p className="diag-open">
          이 아이의 수능 해는 <b>{rm.suneung}년</b>입니다.
          {rm.turns.length > 0 && <> 그리고 학령기 중 <b>{rm.turns[0].year}년</b>, 10년짜리 대운이 통째로 바뀝니다.</>}
        </p>
        <p className="diag-blur">
          그 해의 기운이 이 아이의 공부에 어떤 바람으로 부는지, 초등·중등·고등 각 구간에서 무엇에 힘을 싣고 무엇을 내려놓아야 하는지, 시기별 전략은 정식 리포트의 로드맵 편에서 연도별로 다룹니다.
        </p>
      </div>

      <p className="brush-script" style={{ fontSize: 40 }}>{TEACHER.diag3.split("\n").map((l, i) => <span key={i}>{l}<br /></span>)}</p>

      <div style={{ height: 110 }} />
      <OfferBar onPay={onPay} />
    </section>
  );
}

function useCountdown() {
  const [left, setLeft] = useState(OFFER.DISCOUNT_HOURS * 3600);
  useEffect(() => {
    let deadline;
    try {
      deadline = Number(localStorage.getItem("md_deadline"));
      if (!deadline || deadline < Date.now()) {
        deadline = Date.now() + OFFER.DISCOUNT_HOURS * 3600 * 1000;
        localStorage.setItem("md_deadline", String(deadline));
      }
    } catch (e) {
      deadline = Date.now() + OFFER.DISCOUNT_HOURS * 3600 * 1000;
    }
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
    <div className="offer-bar">
      <div className="offer-badge">{OFFER.BADGE}</div>
      <div className="offer-inner">
        <div className="offer-timer">
          <span className="ot-label">할인혜택 종료까지</span>
          <span className="ot-time">{time}</span>
        </div>
        <button className="offer-cta" onClick={() => { ev("cta_pay_page"); onPay(); }}>
          {OFFER.CTA} <span style={{ marginLeft: 4 }}>⟩</span>
        </button>
      </div>
    </div>
  );
}

// ---------------- 4. 결제 ----------------
function Payment() {
  const [method, setMethod] = useState("naver");
  const price = CONFIG.PRICE;
  const orig = CONFIG.PRICE_ORIGINAL;
  const discount = orig - price;
  const pct = Math.round((discount / orig) * 100);
  useEffect(() => { ev("pay_view"); }, []);

  const METHODS = [
    { id: "naver", label: "네이버페이", tag: "N pay", tagStyle: { background: "#03c75a", color: "#fff" } },
    { id: "kakao", label: "카카오페이", tag: "pay", tagStyle: { background: "#ffe812", color: "#3d1e1e" } },
    { id: "card", label: "카드/간편결제", tag: null },
    { id: "bank", label: "1초 계좌이체", tag: null },
  ];

  return (
    <section className="pay">
      <div className="pay-panel">
        <div className="pay-head">
          <span className="pay-brand">{CONFIG.BRAND_HANJA}</span>
          <b>진로·학업 종합 리포트</b>
        </div>

        <div className="pay-items">
          {REPORT_ITEMS.map((it) => (
            <p key={it.label}><span className="pi-hanja">{it.hanja}</span> {it.label}</p>
          ))}
        </div>

        {METHODS.map((mth) => (
          <label className="pay-method" key={mth.id}>
            <input type="radio" name="method" checked={method === mth.id} onChange={() => setMethod(mth.id)} />
            <span className="pm-label">{mth.label}</span>
            {mth.tag && <span className="pm-tag" style={mth.tagStyle}>{mth.tag}</span>}
          </label>
        ))}

        <div className="pay-proof">
          {SOCIAL_PROOF.enabled && (
            <p className="proof-nums">🌿 누적구매 <b>{SOCIAL_PROOF.buyers}명</b> · 고객만족도 <b>{SOCIAL_PROOF.satisfaction}%</b> 🌿</p>
          )}
          <p className="proof-line">좋은 말만 하지 않습니다. <b>막는 살까지 전부</b> 말씀드립니다.</p>
        </div>

        <div className="pay-trust">
          {TRUST.map((t) => <p key={t}>✓ {t}</p>)}
        </div>

        <div className="pay-table">
          <div className="pt-row">
            <span>{CONFIG.BRAND} 자녀 리포트</span>
            <span className="pt-strike">{orig.toLocaleString("ko-KR")}원</span>
          </div>
          <div className="pt-row pt-red">
            <span>지금 결제 시 할인</span>
            <span>-{discount.toLocaleString("ko-KR")}원</span>
          </div>
          <div className="pt-row pt-final">
            <span>최종 결제금액</span>
            <span><b className="pt-pct">-{pct}%</b> <b>{price.toLocaleString("ko-KR")}원</b></span>
          </div>
        </div>

        <a
          className="pay-btn"
          href={CONFIG.PAYMENT_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => ev("pay_click", { method })}
        >
          결제하기
        </a>

        <p className="pay-delivery">{CONFIG.DELIVERY_NOTE}</p>
        <a className="pay-kakao" href={CONFIG.KAKAO_CHANNEL_URL} target="_blank" rel="noopener noreferrer" onClick={() => ev("kakao_click")}>
          카카오톡 채널 추가하기
        </a>

        <p className="pay-upsell">추가 구성(별도): {UPSELL.join(" · ")}</p>

        <p className="pay-fine">
          결제 정보를 확인했으며 <a href="/privacy" target="_blank">개인정보 수집 및 이용</a>, 환불 정책(수신 후 24시간 내 요청 시 전액 환불)에 동의합니다.
          본 콘텐츠는 명리학 이론 기반 참고용이며 교육적·의학적 판단의 유일한 근거가 될 수 없습니다.
        </p>
      </div>
    </section>
  );
}
