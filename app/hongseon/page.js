"use client";
// ============================================================
// 紅線 소개팅 — 독립 시스템 (투필러 W2·W3)
// 랜딩(감정서 언급 없음) → 가입 4스텝(성별→생년→시→이름·전화)
// → 리드 생성(match_optin) → 명궁 맛보기 → 인연함(/m) 프로필 온보딩
// 감정 퍼널(/reading)로는 보내지 않는다 — 교차는 유도 지점 2곳뿐
// ============================================================
import { useEffect, useRef, useState } from "react";
import { TIME_SLOTS } from "../../lib/content";
import { computeZiwei, STAR_HANJA } from "../../lib/ziwei";
import { ev } from "../../lib/track";

const LINE = "rgba(196,176,255,.3)";
const RED = "#ff8ba3";
const MASK = {
  WebkitMaskImage: "radial-gradient(ellipse 66% 72% at 50% 38%, black 52%, transparent 97%)",
  maskImage: "radial-gradient(ellipse 66% 72% at 50% 38%, black 52%, transparent 97%)",
};

function Btn({ children, onClick, red, ghost, disabled, style = {} }) {
  return (
    <button onClick={onClick} disabled={disabled} className="btn" style={{
      display: "block", width: "100%", marginBottom: 10, fontSize: 15, opacity: disabled ? .45 : 1,
      ...(red ? { background: "rgba(255,90,122,.12)", border: "1px solid rgba(255,90,122,.6)", color: RED } : {}),
      ...(ghost ? { background: "transparent", border: `1px solid ${LINE}`, color: "var(--tx)" } : {}),
      ...style,
    }}>{children}</button>
  );
}
const Say = ({ children }) => (
  <p className="say" style={{ textAlign: "center", fontSize: 14.5, lineHeight: 1.75, margin: "0 0 18px" }}>{children}</p>
);
const Q = ({ no, children }) => (
  <>
    <span className="qnum" style={{ color: RED }}>紅線 · 가입 {no} / 四</span>
    <h2 className="q">{children}</h2>
  </>
);
const Ask = ({ children }) => (
  <section className="ask" style={{ minHeight: "auto", paddingBottom: 40 }}>
    <div className="stars" />
    <div className="elder-moon" aria-hidden="true" />
    <div style={{ position: "relative", zIndex: 2 }}>{children}</div>
  </section>
);


export default function Hongseon() {
  const [step, setStep] = useState("land");
  const [myMatch, setMyMatch] = useState(null);
  const [f, setF] = useState({ gender: null, cal: "solar", leap: false, digits: "", slot: null, timeUnknown: false, name: "", phone: "", consent: false, mkt: false });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ming, setMing] = useState(null);
  const [doneToken, setDoneToken] = useState(null);
  const topRef = useRef(null);

  useEffect(() => {
    try {
      setMyMatch(localStorage.getItem("hs_my_match"));
      sessionStorage.setItem("hs_focus", "hongseon");
    } catch (e) {}
  }, []);
  const goto = (s) => { setStep(s); setErr(""); ev("hs_signup_" + s); setTimeout(() => topRef.current?.scrollIntoView({ behavior: "auto" }), 20); };

  const digits = f.digits.replace(/[^0-9]/g, "").slice(0, 8);
  const disp = digits.length >= 5
    ? `${digits.slice(0, 4)}년 ${digits.slice(4, 6)}월 ${digits.slice(6, 8)}일`
    : digits.length >= 4 ? `${digits.slice(0, 4)}년 ${digits.slice(4)}` : digits;
  const birthProblem = (() => {
    if (digits.length !== 8) return null;
    const y = +digits.slice(0, 4), m = +digits.slice(4, 6), d = +digits.slice(6, 8);
    if (y < 1930 || y > new Date().getFullYear()) return "연도를 다시 확인해주세요.";
    if (m < 1 || m > 12) return "월(月)을 다시 확인해주세요.";
    if (d < 1 || d > 31) return "일(日)을 다시 확인해주세요.";
    return null;
  })();
  const birthValid = digits.length === 8 && !birthProblem;

  const submit = async () => {
    const phone = f.phone.replace(/[^0-9]/g, "");
    if (f.name.trim().length < 2) { setErr("이름을 확인해주세요."); return; }
    if (phone.length < 10) { setErr("전화번호를 확인해주세요."); return; }
    setBusy(true); setErr("");
    try {
      let sy = +digits.slice(0, 4), sm = +digits.slice(4, 6), sd = +digits.slice(6, 8);
      const mod = await import("korean-lunar-calendar");
      const KLC = mod.default || mod;
      if (f.cal === "lunar") {
        const c = new KLC();
        if (!c.setLunarDate(sy, sm, sd, f.leap)) throw new Error("음력 날짜를 확인해주세요.");
        const sol = c.getSolarCalendar();
        sy = sol.year; sm = sol.month; sd = sol.day;
      }
      const c2 = new KLC();
      if (!c2.setSolarDate(sy, sm, sd)) throw new Error("날짜를 확인해주세요.");
      const lun = c2.getLunarCalendar();
      const slotIdx = f.timeUnknown ? 6 : f.slot;
      const z = computeZiwei({
        lunarYear: lun.year, lunarMonth: lun.month, lunarDay: lun.day,
        hourBranch: slotIdx, gender: f.gender,
        solarYear: sy, solarMonth: sm, solarDay: sd,
      });
      const eff = z.effectiveMajors(z.palaceAt("명궁"));
      const spouse = z.effectiveMajors(z.palaceAt("부처궁"));

      const r = await fetch("/api/lead", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: f.name.trim(), phone, mkt: !!f.mkt,
          birth: {
            y: sy, m: sm, d: sd, slotIdx,
            slot: f.timeUnknown ? "미상(오시 추정)" : TIME_SLOTS[f.slot].label,
            gender: f.gender, cal: f.cal, leap: f.leap,
            concern: null, loveStatus: null, focus: "hongseon-signup", utm: null,
          },
          salNames: [`명궁:${eff.stars.join("·") || "공궁"}`, `부처:${spouse.stars.join("·") || "공궁"}`],
          salCount: eff.stars.length,
        }),
      });
      const j = await r.json();
      if (!j?.token) throw new Error("가입에 실패했어요. 잠시 후 다시 시도해주세요.");
      await fetch("/api/lead", {
        method: "PATCH", headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: j.id, matchOptin: true }),
      }).catch(() => {});
      try {
        localStorage.setItem("hs_my_match", j.token);
        localStorage.setItem("hs_last", JSON.stringify({ y: sy, m: sm, d: sd, slot: slotIdx, gender: f.gender, name: f.name.trim(), token: j.token }));
      } catch (e) {}
      setMing({ stars: eff.stars.join("·") || "공궁", hanja: STAR_HANJA[eff.stars[0]] || "" });
      setDoneToken(j.token);
      ev("hs_signup_done");
      goto("done");
    } catch (e) {
      setErr(e.message || "잠시 후 다시 시도해주세요.");
    } finally { setBusy(false); }
  };

  return (
    <main className="wrap" style={{ paddingTop: 0, paddingBottom: 70 }} ref={topRef}>
      {step === "land" && (
        <>
          <div style={{ margin: "0 -22px" }}>
            <img src="/char/thread.webp" alt="붉은 실을 든 홍서 아씨" width={760} height={1010}
              style={{ display: "block", width: "min(100%, 520px)", height: "auto", margin: "0 auto", ...MASK }} />
          </div>
          <div style={{ marginTop: -70, position: "relative", zIndex: 2 }}>
            <div className="eyebrow" style={{ textAlign: "center" }}>紅線 · 별자리로 만나는 소개팅</div>
            <h1 className="display" style={{ fontSize: 24, textAlign: "center", margin: "10px 0 8px", color: "var(--tx)", lineHeight: 1.5, textShadow: "0 2px 18px rgba(11,10,34,.9)" }}>
              사진 대신, 명반.<br />타고난 기질의 합으로 잇습니다
            </h1>
          </div>

          <div style={{ border: `1px solid ${LINE}`, borderRadius: 16, padding: "16px 18px", margin: "18px 0 12px", background: "rgba(139,108,255,.06)" }}>
            <b style={{ fontSize: 13.5, color: "var(--tx)" }}>이렇게 흘러가요</b>
            <div style={{ fontSize: 13, color: "var(--tx-dim)", lineHeight: 2, marginTop: 6 }}>
              ① 3분 가입 — 태어난 순간으로 <b style={{ color: "var(--tx)" }}>명반</b>을 폅니다<br />
              ② 매일 밤, 궁합이 가장 맞는 <b style={{ color: "var(--tx)" }}>한 분의 카드</b>를 받고<br />
              ③ 서로 [잇기]를 누르면 — 그 순간 <b style={{ color: RED }}>서로의 번호가 열려요</b>
            </div>
          </div>
          <p style={{ textAlign: "center", fontSize: 12, color: "var(--tx-dim)", marginBottom: 18 }}>
            실명·사진 비공개 · 하루 한 명만 · 베타 기간 성사비 0원
          </p>

          {myMatch ? (
            <>
              <Btn red onClick={() => (window.location.href = `/m/${myMatch}`)}>🧧 내 인연함 열기 — 오늘의 카드 ›</Btn>
              <Btn ghost onClick={() => goto("gender")}>새 명반으로 다시 가입하기 ›</Btn>
            </>
          ) : (
            <>
              <Btn red onClick={() => goto("gender")}>무료로 시작하기 (3분) ›</Btn>
              <Btn ghost onClick={() => (window.location.href = "/my")}>이미 회원이에요 — 🌙 내 서고에서 찾기 ›</Btn>
            </>
          )}
        </>
      )}

      {step === "gender" && (
        <Ask>
          <Say>인연을 이으려면,<br />먼저 별자리부터 볼게요.</Say>
          <Q no="①">어느 쪽이세요?</Q>
          <div style={{ display: "flex", gap: 10, marginTop: 26 }}>
            {[["M", "남자"], ["F", "여자"]].map(([v, t]) => (
              <button key={v} className="next" style={{ flex: 1, opacity: 1 }} onClick={() => { setF({ ...f, gender: v }); goto("birth"); }}>{t}</button>
            ))}
          </div>
        </Ask>
      )}

      {step === "birth" && (
        <Ask>
          <Q no="②">태어난 날을 알려주세요</Q>
          <div className="cal-toggle">
            <button className={f.cal === "solar" ? "on" : ""} onClick={() => setF({ ...f, cal: "solar" })}>양력</button>
            <button className={f.cal === "lunar" ? "on" : ""} onClick={() => setF({ ...f, cal: "lunar" })}>음력</button>
          </div>
          <input className="field" type="tel" inputMode="numeric" autoComplete="off" enterKeyHint="next"
            placeholder="예) 19960715" value={digits} maxLength={8} autoFocus
            style={{ letterSpacing: "0.12em" }}
            onChange={(e) => setF({ ...f, digits: e.target.value.replace(/[^0-9]/g, "").slice(0, 8) })}
            onKeyDown={(e) => e.key === "Enter" && birthValid && goto("time")} />
          {digits.length > 0 && digits.length < 8 && (
            <p className="input-hint" style={{ opacity: .8 }}>{disp}… — 8자리로 적어주세요</p>
          )}
          {birthValid && <p className="input-hint" style={{ color: "var(--tx)" }}>{disp}</p>}
          {birthProblem && <p className="input-hint" style={{ color: RED }}>{birthProblem}</p>}
          {f.cal === "lunar" && (
            <label className="chk"><input type="checkbox" checked={f.leap} onChange={(e) => setF({ ...f, leap: e.target.checked })} /> 윤달이에요</label>
          )}
          <button className="next" disabled={!birthValid} onClick={() => goto("time")}>다 음 ›</button>
        </Ask>
      )}

      {step === "time" && (
        <Ask>
          <Q no="③">태어난 시(時)는 언제예요?</Q>
          <div className="slot-grid" style={{ marginTop: 20 }}>
            {TIME_SLOTS.map((s, i) => (
              <button key={s.label} className="slot-btn" onClick={() => { setF({ ...f, slot: i, timeUnknown: false }); goto("contact"); }}>{s.label}</button>
            ))}
          </div>
          <button className="next" style={{ opacity: 1 }} onClick={() => { setF({ ...f, timeUnknown: true, slot: 6 }); goto("contact"); }}>몰라도 괜찮아요 — 모름으로 진행 ›</button>
        </Ask>
      )}

      {step === "contact" && (
        <Ask>
          <Q no="④">마지막이에요 — 카드 받을 연락처</Q>
          <input className="field" placeholder="이름" value={f.name} autoFocus
            onChange={(e) => setF({ ...f, name: e.target.value })} />
          <input className="field" type="tel" inputMode="numeric" autoComplete="off"
            placeholder="010-0000-0000" value={f.phone} style={{ marginTop: 14 }}
            onChange={(e) => setF({ ...f, phone: e.target.value })} />
          <label className="chk" style={{ marginTop: 10 }}>
            <input type="checkbox" checked={f.mkt} onChange={(e) => setF({ ...f, mkt: e.target.checked })} />{" "}
            🎁 [선택] 혜택·이벤트 소식도 문자로 받을게요
          </label>
          {err && <p className="input-hint" style={{ color: RED }}>{err}</p>}
          <button className="next" disabled={busy} onClick={submit}>{busy ? "명반을 펴는 중…" : "가입하고 명반 펴기 ›"}</button>
          <p style={{ fontSize: 10.5, color: "var(--tx-dim)", textAlign: "center", marginTop: 10, lineHeight: 1.6 }}>
            가입을 누르면 만 19세 이상이며 <a href="/privacy" target="_blank" style={{ color: "inherit" }}>개인정보 수집·이용</a>(궁합 산출·카드 알림)에 동의한 것으로 봐요.<br />실명·번호는 상대에게 공개되지 않아요.
          </p>
        </Ask>
      )}

      {step === "done" && (
        <div style={{ paddingTop: 40, textAlign: "center" }}>
          <div style={{ margin: "0 -22px" }}>
            <img src="/char/match.webp" alt="" width={760} height={1010}
              style={{ display: "block", width: "min(88%, 420px)", height: "auto", margin: "0 auto", ...MASK }} />
          </div>
          <h2 className="display" style={{ fontSize: 22, color: "var(--tx)", margin: "-46px 0 10px", position: "relative", lineHeight: 1.5 }}>
            명반을 폈어요!
          </h2>
          {ming && (
            <p style={{ fontSize: 13.5, color: "var(--tx-dim)", marginBottom: 6 }}>
              {f.name.trim()} 님의 명궁 — <b style={{ color: "var(--gold)" }}>{ming.stars}</b>
              {ming.hanja && <><br /><span className="mono" style={{ fontSize: 11 }}>{ming.hanja}</span></>}
            </p>
          )}
          <p style={{ fontSize: 13, color: "var(--tx-dim)", margin: "0 0 20px", lineHeight: 1.7 }}>
            이제 프로필만 만들면 —<br /><b style={{ color: RED }}>오늘 밤, 첫 인연 카드</b>가 갑니다.
          </p>
          <Btn red onClick={() => (window.location.href = `/m/${doneToken}`)}>프로필 만들러 가기 (1분) ›</Btn>
        </div>
      )}
    </main>
  );
}
