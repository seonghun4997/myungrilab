"use client";
// ============================================================
// 퍼널: 영상 씬(탈출하기) → 귀신 대화형 입력(성별→생일→생시→연락처→이름)
//       → 깃든 살 진단(일부 공개+블러) → 결제
// ============================================================
import { useState, useMemo, useRef, useEffect } from "react";
import { computeSaju, REGIONS } from "../lib/engine";
import { salList } from "../lib/insights";
import { CONFIG, GHOST, OFFER, SOCIAL_PROOF, TIME_SLOTS } from "../lib/content";
import { track } from "@vercel/analytics";

function ev(name, data) {
  try { track(name, data || {}); } catch (e) {}
}

const INPUT_STEPS = ["gender", "birth", "time", "phone", "name"];

export default function Home() {
  const [step, setStep] = useState("intro"); // intro → gender→birth→time→phone→name → checking → diag → pay
  const [form, setForm] = useState({
    gender: null, cal: "solar", leap: false,
    y: null, m: null, d: null,
    slot: null, // TIME_SLOTS index
    phone: "", name: "", consent: false,
  });
  const [saju, setSaju] = useState(null);
  const [leadId, setLeadId] = useState(null);
  const topRef = useRef(null);

  const goto = (s) => {
    setStep(s);
    ev("step_" + s);
    setTimeout(() => topRef.current?.scrollIntoView({ behavior: "auto" }), 20);
  };

  const submitAll = async () => {
    // 양력 변환
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

    // 디비 저장
    try {
      const sals = salList(result).filter((s) => !s.good).map((s) => s.name);
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.replace(/[^0-9]/g, ""),
          birth: { y: sy, m: sm, d: sd, hour: slot.hour, minute: slot.minute || 0, gender: form.gender, region: "미상", cal: form.cal, leap: form.leap, slot: slot.label },
          salNames: sals,
          salCount: sals.length,
        }),
      });
      const data = await res.json();
      setLeadId(data.id);
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
        <GhostFlow step={step} form={form} setForm={setForm} goto={goto} onSubmit={submitAll} />
      )}
      {step === "checking" && <Checking />}
      {step === "diag" && saju && <Diagnosis saju={saju} name={form.name} onPay={() => goto("pay")} />}
      {step === "pay" && saju && <Payment saju={saju} />}
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
      <div className="intro-grain" aria-hidden="true" />
      <div className="intro-vignette" aria-hidden="true" />

      <div className="intro-content">
        <p className="scene-line">&lsquo;저 산에 <span className="scene-red">살무당</span>을 찾아가봐&rsquo;</p>
      </div>

      <div className="intro-cta-bar">
        <button className="intro-cta" onClick={() => { ev("cta_start"); onStart(); }}>
          <span className="cta-seal" aria-hidden="true">煞</span>
          <span className="cta-label">탈출하기</span>
          <span className="cta-seal" aria-hidden="true">煞</span>
        </button>
      </div>
    </section>
  );
}

// ---------------- 1. 귀신 대화형 입력 ----------------
function GhostFlow({ step, form, setForm, goto, onSubmit }) {
  const idx = INPUT_STEPS.indexOf(step);
  const next = () => goto(INPUT_STEPS[idx + 1]);

  const rows = [];
  if (form.name && step !== "name") rows.push({ k: "이름", v: form.name, s: "name" });
  if (form.phone && idx > INPUT_STEPS.indexOf("phone")) rows.push({ k: "전화번호", v: form.phone, s: "phone" });
  if (form.slot != null && idx > INPUT_STEPS.indexOf("time")) rows.push({ k: "생시", v: TIME_SLOTS[form.slot].label, s: "time" });
  if (form.y && idx > INPUT_STEPS.indexOf("birth")) rows.push({ k: "생년월일", v: `${form.y}년 ${form.m}월 ${form.d}일 (${form.cal === "solar" ? "양력" : "음력"})`, s: "birth" });
  if (form.gender && idx > INPUT_STEPS.indexOf("gender")) rows.push({ k: "성별", v: form.gender === "M" ? "남자" : "여자", s: "gender" });

  const G = GHOST[step];

  return (
    <section className="ghost-stage">
      <div className="ghost-head">
        {step === "gender" && <p className="ghost-say">{GHOST.intro.split("\n").map((l, i) => <span key={i}>{l}<br /></span>)}</p>}
        {step !== "gender" && (
          <>
            <h2 className="ghost-q">{G.q}</h2>
            {G.sub && <p className="ghost-sub">{G.sub}</p>}
          </>
        )}
      </div>

      {/* 입력 영역 */}
      <div className="ghost-input">
        {step === "birth" && <BirthInput form={form} setForm={setForm} onDone={next} />}
        {step === "time" && <TimeInput form={form} setForm={setForm} onDone={next} />}
        {step === "phone" && <PhoneInput form={form} setForm={setForm} onDone={next} />}
        {step === "name" && <NameInput form={form} setForm={setForm} onDone={onSubmit} />}
      </div>

      {/* 이전 입력값 */}
      {rows.length > 0 && (
        <div className="ghost-rows">
          {rows.map((r) => (
            <div className="g-row" key={r.k}>
              <span className="g-k">{r.k}</span>
              <button className="g-v" onClick={() => goto(r.s)}>{r.v} <span className="g-edit">✎</span></button>
            </div>
          ))}
        </div>
      )}

      {/* 도깨비불 */}
      <div className="ghost-flame-wrap" aria-hidden="true">
        <img src="/ghost.png" alt="" className="ghost-img" onError={(e) => { e.currentTarget.style.display = "none"; }} />
        <div className="soul-flame">
          <div className="flame f1" /><div className="flame f2" /><div className="flame f3" />
          <div className="flame-core" />
          <div className="eye e1" /><div className="eye e2" />
        </div>
      </div>

      {/* 성별 하단 시트 */}
      {step === "gender" && (
        <div className="gender-sheet">
          <h2 className="sheet-q">{GHOST.gender.q}</h2>
          <button className="sheet-btn" onClick={() => { setForm({ ...form, gender: "M" }); ev("gender_set"); next(); }}>남자예요</button>
          <button className="sheet-btn" onClick={() => { setForm({ ...form, gender: "F" }); ev("gender_set"); next(); }}>여자예요</button>
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
    if (y < 1920 || y > new Date().getFullYear()) return false;
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
        className="ghost-field"
        inputMode="numeric"
        placeholder="0000년 00월 00일"
        value={disp}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && commit()}
        autoFocus
      />
      {form.cal === "lunar" && (
        <label className="ghost-check">
          <input type="checkbox" checked={form.leap} onChange={(e) => setForm({ ...form, leap: e.target.checked })} /> 윤달
        </label>
      )}
      <button className="ghost-next" disabled={!valid} onClick={commit}>다음</button>
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
        className="ghost-field"
        inputMode="tel"
        placeholder="010-0000-0000"
        value={disp}
        onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/[^0-9]/g, "").slice(0, 11) })}
        onKeyDown={(e) => e.key === "Enter" && commit()}
        autoFocus
      />
      <button className="ghost-next" disabled={!valid} onClick={commit}>다음</button>
    </div>
  );
}

function NameInput({ form, setForm, onDone }) {
  const valid = form.name.trim().length >= 1 && form.consent;
  return (
    <div>
      <input
        className="ghost-field"
        placeholder="이름"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value.slice(0, 12) })}
        autoFocus
      />
      <label className="ghost-check">
        <input type="checkbox" checked={form.consent} onChange={(e) => setForm({ ...form, consent: e.target.checked })} />
        <span><a href="/privacy" target="_blank">개인정보 수집·이용</a> 동의 (풀이 산출·전달 목적)</span>
      </label>
      <button className="ghost-cta" disabled={!valid} onClick={() => { ev("name_set"); onDone(); }}>
        깃든 살 확인하기 <span style={{ marginLeft: 6 }}>›</span>
      </button>
    </div>
  );
}

// ---------------- 2. 확인 중 ----------------
function Checking() {
  return (
    <section className="ghost-stage" style={{ justifyContent: "center" }}>
      <p className="ghost-say" style={{ fontSize: 26 }}>{GHOST.checking}</p>
      <div className="ghost-flame-wrap checking" aria-hidden="true">
        <div className="soul-flame">
          <div className="flame f1" /><div className="flame f2" /><div className="flame f3" />
          <div className="flame-core" />
          <div className="eye e1" /><div className="eye e2" />
        </div>
      </div>
    </section>
  );
}

// ---------------- 3. 진단 (일부 공개 + 블러) ----------------
function firstSentence(text) {
  const m = text.match(/^.*?다\./);
  return m ? m[0] : text.slice(0, 40);
}

function Diagnosis({ saju, name, onPay }) {
  const sals = useMemo(() => salList(saju).filter((s) => !s.good), [saju]);
  const first = sals[0];
  useEffect(() => { ev("diag_view", { salCount: sals.length }); }, []); // eslint-disable-line

  return (
    <section className="diag">
      <p className="red-script">{(sals.length ? GHOST.diag1 : GHOST.diagNoSal).split("\n").map((l, i) => <span key={i}>{l}<br /></span>)}</p>

      {first && (
        <>
          <p className="diag-salname">
            {name ? `${name}, ` : ""}네 몸에 깃든 살 — <b>{sals.length}개</b><br />
            <span className="diag-first">그중 하나는 <b>{first.name}살({first.hanja})</b></span>
          </p>
          <div className="diag-card">
            <h3>이 살이 미치는 영향</h3>
            <p className="diag-open">{firstSentence(first.desc)}</p>
            <p className="diag-blur">
              {first.desc.slice(firstSentence(first.desc).length)} 이 살이 발동하는 시기는 대운과 세운이 맞물리는 해로, 특히 앞으로 다가올 몇 해 중 한 해에 크게 움직일 조짐이 보인다. 그 해에 무엇을 조심해야 하는지, 어떤 결정을 미뤄야 하는지는 정식 살풀이에서 낱낱이 다룬다.
            </p>
          </div>
        </>
      )}

      {sals.length > 1 && (
        <div className="diag-card">
          <h3>아직 열지 않은 살 — {sals.length - 1}개</h3>
          <p className="diag-blur">
            {sals.slice(1).map((s) => `${s.name}살(${s.hanja}) — ${s.short}. ${s.desc}`).join(" ")}
          </p>
        </div>
      )}

      <p className="red-script">{GHOST.diag2.split("\n").map((l, i) => <span key={i}>{l}<br /></span>)}</p>

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
      deadline = Number(localStorage.getItem("hs_deadline"));
      if (!deadline || deadline < Date.now()) {
        deadline = Date.now() + OFFER.DISCOUNT_HOURS * 3600 * 1000;
        localStorage.setItem("hs_deadline", String(deadline));
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
function Payment({ saju }) {
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
        {METHODS.map((mth) => (
          <label className="pay-method" key={mth.id}>
            <input type="radio" name="method" checked={method === mth.id} onChange={() => setMethod(mth.id)} />
            <span className="pm-label">{mth.label}</span>
            {mth.tag && <span className="pm-tag" style={mth.tagStyle}>{mth.tag}</span>}
          </label>
        ))}

        <div className="pay-proof">
          {SOCIAL_PROOF.enabled ? (
            <p className="proof-nums">
              🌿 누적구매 <b>{SOCIAL_PROOF.buyers}명</b> · 고객만족도 <b>{SOCIAL_PROOF.satisfaction}%</b> 🌿
            </p>
          ) : null}
          <p className="proof-line">좋지 않은 팔자도 <b>솔직하게</b> 알려드려요</p>
        </div>

        <div className="pay-table">
          <div className="pt-row">
            <span>{CONFIG.BRAND} 살풀이 사주</span>
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

        <p className="pay-fine">
          결제 정보를 확인했으며 <a href="/privacy" target="_blank">개인정보 수집 및 이용</a>, 환불 정책(수신 후 24시간 내 요청 시 전액 환불)에 동의합니다.
          본 콘텐츠는 명리학 이론 기반 참고용이며 의학적·법률적·투자 판단의 근거가 될 수 없습니다.
        </p>
      </div>
    </section>
  );
}
