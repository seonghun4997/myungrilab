"use client";
// ============================================================
// 내 서고 (/my) — 전화번호 + 문자 6자리로 여는 마이페이지
// 단계: auth 확인 → phone → code → 서고 홈
// 기기 저장: hs_lib_auth = { t }  (서버 토큰이 90일 만료 관리)
// ============================================================
import { useEffect, useRef, useState } from "react";

const LINE = "rgba(196,176,255,.3)";

function Card({ children, accent, href, onClick, style = {} }) {
  const Tag = href ? "a" : "div";
  return (
    <Tag href={href} onClick={onClick} style={{
      display: "block", textDecoration: "none", cursor: href || onClick ? "pointer" : "default",
      border: `1px solid ${accent || LINE}`, borderRadius: 14, padding: "14px 16px", marginBottom: 10,
      background: "rgba(139,108,255,.06)", color: "var(--tx)", ...style,
    }}>{children}</Tag>
  );
}

export default function MyLib() {
  const [step, setStep] = useState("loading"); // loading | phone | code | lib | empty
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [data, setData] = useState(null);
  const codeRef = useRef(null);

  const fetchLib = async (t) => {
    const r = await fetch(`/api/my?t=${encodeURIComponent(t)}`);
    if (r.status === 401) return null;
    const j = await r.json().catch(() => null);
    return j && j.ok ? j : null;
  };

  useEffect(() => {
    (async () => {
      let t = null;
      try { t = JSON.parse(localStorage.getItem("hs_lib_auth") || "null")?.t; } catch (e) {}
      if (t) {
        const j = await fetchLib(t);
        if (j) { setData(j); setStep(j.empty ? "empty" : "lib"); return; }
        try { localStorage.removeItem("hs_lib_auth"); } catch (e) {}
      }
      setStep("phone");
    })();
  }, []);

  const reqCode = async () => {
    const p = phone.replace(/[^0-9]/g, "");
    if (p.length < 10) { setErr("전화번호를 확인해주세요."); return; }
    setBusy(true); setErr("");
    const r = await fetch("/api/my/code", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phone: p }) });
    setBusy(false);
    if (!r.ok) { setErr("잠시 후 다시 시도해주세요."); return; }
    setStep("code");
    setTimeout(() => codeRef.current && codeRef.current.focus(), 50);
  };

  const verify = async () => {
    const p = phone.replace(/[^0-9]/g, "");
    const c = code.replace(/[^0-9]/g, "");
    if (c.length !== 6) { setErr("문자로 온 6자리를 입력해주세요."); return; }
    setBusy(true); setErr("");
    const r = await fetch("/api/my/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phone: p, code: c }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!j.ok) { setErr(j.error || "다시 시도해주세요."); return; }
    try { localStorage.setItem("hs_lib_auth", JSON.stringify({ t: j.token })); } catch (e) {}
    const lib = await fetchLib(j.token);
    if (lib) { setData(lib); setStep(lib.empty ? "empty" : "lib"); }
    else setErr("서고를 여는 데 실패했어요. 다시 시도해주세요.");
  };

  const logout = () => {
    try { localStorage.removeItem("hs_lib_auth"); } catch (e) {}
    setData(null); setCode(""); setStep("phone");
  };

  const inputStyle = {
    width: "100%", padding: "14px", fontSize: 16, borderRadius: 12, marginBottom: 10,
    background: "rgba(139,108,255,.08)", border: `1px solid ${LINE}`, color: "var(--tx)", textAlign: "center",
  };

  return (
    <main className="wrap" style={{ paddingTop: 44, paddingBottom: 70 }}>
      <div className="eyebrow" style={{ textAlign: "center" }}>紅緖堂</div>
      <h1 className="display" style={{ fontSize: 24, textAlign: "center", margin: "10px 0 6px", color: "var(--tx)" }}>🌙 내 서고</h1>

      {step === "loading" && (
        <p style={{ textAlign: "center", fontSize: 13, color: "var(--tx-dim)", marginTop: 30 }}>서고 문을 여는 중…</p>
      )}

      {step === "phone" && (
        <>
          <p style={{ textAlign: "center", fontSize: 13, color: "var(--tx-dim)", marginBottom: 22, lineHeight: 1.7 }}>
            가입도 비밀번호도 없어요.<br />감정 받을 때 쓴 전화번호면 충분해요.
          </p>
          <input style={inputStyle} className="mono" type="tel" inputMode="numeric" placeholder="010-0000-0000"
            value={phone} onChange={(e) => setPhone(e.target.value)} onKeyDown={(e) => e.key === "Enter" && reqCode()} />
          <button className="btn" style={{ fontSize: 15 }} disabled={busy} onClick={reqCode}>{busy ? "보내는 중…" : "인증 문자 받기"}</button>
          {err && <p style={{ textAlign: "center", fontSize: 12.5, color: "#ff8ba3", marginTop: 10 }}>{err}</p>}
        </>
      )}

      {step === "code" && (
        <>
          <p style={{ textAlign: "center", fontSize: 13, color: "var(--tx-dim)", marginBottom: 22, lineHeight: 1.7 }}>
            {phone} 로 보낸<br /><b style={{ color: "var(--tx)" }}>6자리 번호</b>를 입력해주세요. (5분 유효)
          </p>
          <input ref={codeRef} style={{ ...inputStyle, letterSpacing: 8, fontSize: 22 }} className="mono" type="tel" inputMode="numeric" maxLength={6} placeholder="______"
            value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => e.key === "Enter" && verify()} />
          <button className="btn" style={{ fontSize: 15 }} disabled={busy} onClick={verify}>{busy ? "확인 중…" : "서고 열기"}</button>
          <button onClick={() => { setStep("phone"); setErr(""); }} style={{ display: "block", margin: "12px auto 0", background: "none", border: "none", color: "var(--tx-dim)", fontSize: 12, cursor: "pointer" }}>번호 다시 입력 / 문자 재발송</button>
          {err && <p style={{ textAlign: "center", fontSize: 12.5, color: "#ff8ba3", marginTop: 10 }}>{err}</p>}
          <p style={{ textAlign: "center", fontSize: 11, color: "var(--tx-dim)", marginTop: 18 }}>인증하면 이 기기에서 90일간 자동으로 열려요.</p>
        </>
      )}

      {step === "empty" && (
        <>
          <p style={{ textAlign: "center", fontSize: 13.5, color: "var(--tx-dim)", margin: "26px 0", lineHeight: 1.8 }}>
            아직 서고가 비어 있어요.<br />첫 명반을 펴볼까요?
          </p>
          <a href="/reading" className="btn" style={{ display: "block", textAlign: "center", textDecoration: "none", fontSize: 15 }}>첫 감정 받으러 가기 ›</a>
        </>
      )}

      {step === "lib" && data && (
        <>
          {/* 프로필 카드 */}
          <Card accent="rgba(255,212,121,.55)" style={{ marginTop: 16 }}>
            <b style={{ fontSize: 16 }}>{data.name ? `${data.name} 님의 서고` : "나의 서고"}</b>
            <div className="mono" style={{ fontSize: 11.5, color: "var(--tx-dim)", marginTop: 5 }}>
              {data.birthLabel}{data.tag && <> · <span style={{ color: "var(--gold)" }}>{data.tag}</span></>}
            </div>
          </Card>

          {/* 내 감정서 */}
          {data.reports.length ? data.reports.map((r) => (
            <Card key={r.token} accent="rgba(255,212,121,.45)" href={`/r/${r.token}${r.readPos > 0 ? `?p=${r.readPos}` : ""}`}>
              <b style={{ fontSize: 14.5 }}>📜 {r.product}</b>
              <div style={{ fontSize: 12.5, color: r.readPos > 0 ? "var(--gold)" : "var(--tx-dim)", marginTop: 4 }}>
                {r.readPos > 0 ? `읽던 곳부터 이어 읽기 ›` : "처음부터 읽기 ›"}
                <span className="mono" style={{ fontSize: 10.5, color: "var(--tx-dim)", marginLeft: 8 }}>{r.date}</span>
              </div>
            </Card>
          )) : (
            <Card style={{ opacity: .75 }}>
              <b style={{ fontSize: 13.5 }}>📜 감정서 준비 중</b>
              <div style={{ fontSize: 12, color: "var(--tx-dim)", marginTop: 4 }}>입금 확인 후 문자로 알려드려요. 완성되면 여기에도 꽂혀요.</div>
            </Card>
          )}

          {/* 인연함 */}
          {data.matchToken && (
            <Card accent="rgba(255,107,138,.5)" href={`/m/${data.matchToken}`}>
              <b style={{ fontSize: 14.5, color: "#ff8ba3" }}>🧧 내 인연함</b>
              <div style={{ fontSize: 12.5, color: "var(--tx-dim)", marginTop: 4 }}>
                {data.hasProfile ? "오늘의 카드 확인하러 가기 ›" : "紅線 프로필 만들고 시작하기 ›"}
              </div>
            </Card>
          )}

          {/* 더 */}
          <Card href="/reading">
            <b style={{ fontSize: 13.5 }}>🎁 새 감정 · 소중한 사람 감정 선물하기</b>
            <div style={{ fontSize: 12, color: "var(--tx-dim)", marginTop: 3 }}>어머니의 명반, 그 사람의 명반 ›</div>
          </Card>

          {/* 계정 */}
          <Card>
            <b style={{ fontSize: 12.5, color: "var(--tx-dim)" }}>계정</b>
            <div style={{ fontSize: 12.5, marginTop: 4 }}>📱 {data.phoneMasked}</div>
            <div style={{ fontSize: 11, color: "var(--tx-dim)", marginTop: 3 }}>생년 정보 수정은 감정서 문자에 회신해주세요.</div>
            <button onClick={logout} style={{ marginTop: 8, background: "none", border: "none", color: "var(--tx-dim)", fontSize: 11.5, cursor: "pointer", textDecoration: "underline", padding: 0 }}>이 기기에서 서고 닫기</button>
          </Card>

          <a href="/" style={{ display: "block", textAlign: "center", fontSize: 12.5, color: "var(--tx-dim)", marginTop: 16 }}>‹ 홍서당 처음으로</a>
        </>
      )}
    </main>
  );
}
