"use client";
// ============================================================
// /admin — 디비 관리 (ADMIN_KEY로 접근)
// 리드 목록 → [리포트 생성] → 링크 복사 → 카카오톡으로 전달
// ============================================================
import { useState } from "react";
import { CONFIG } from "../../lib/content";

// 검색 — 이름 / 전화번호 / 주문코드(토큰 앞 6자리)
function filterLeads(leads, q) {
  const norm = (q || "").trim().toLowerCase();
  if (!norm) return leads;
  const digits = norm.replace(/[^0-9]/g, "");
  return leads.filter((l) => {
    const code = (l.token || "").slice(0, 6).toLowerCase();
    return (
      (l.name || "").toLowerCase().includes(norm) ||
      (digits.length >= 2 && (l.phone || "").includes(digits)) ||
      (norm.length >= 2 && code.includes(norm))
    );
  });
}

export default function Admin() {
  const [key, setKey] = useState("");
  const [leads, setLeads] = useState(null);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState({});
  const [msg, setMsg] = useState("");
  const [sel, setSel] = useState([]);      // 매칭용 선택 (최대 2)
  const [preview, setPreview] = useState(null);
  const [matches, setMatches] = useState(null);
  const [funnel, setFunnel] = useState(null);

  const load = async () => {
    setMsg("");
    const res = await fetch("/api/admin/leads", { headers: { "x-admin-key": key } });
    const data = await res.json();
    if (!res.ok) { setMsg(data.error || "불러오기 실패"); return; }
    setLeads(data.leads);
    const mr = await fetch("/api/admin/match", { headers: { "x-admin-key": key } });
    const md = await mr.json();
    if (mr.ok) setMatches(md.matches);
    const fr = await fetch("/api/admin/funnel", { headers: { "x-admin-key": key } });
    const fd = await fr.json();
    if (fr.ok) setFunnel(fd.funnel);
  };

  const toggleSel = (id) =>
    setSel((xs) => (xs.includes(id) ? xs.filter((x) => x !== id) : xs.length < 2 ? [...xs, id] : [xs[1], id]));

  const matchAction = async (action) => {
    if (sel.length !== 2) { setMsg("紅線신청자 2명을 선택하세요."); return; }
    setMsg(action === "preview" ? "궁합 계산 중..." : "카드 발송 중...");
    let res, d;
    try {
      res = await fetch("/api/admin/match", {
        method: "POST",
        headers: { "content-type": "application/json", "x-admin-key": key },
        body: JSON.stringify({ action, aId: sel[0], bId: sel[1] }),
      });
      d = await res.json();
    } catch (e) { setMsg("요청 실패: " + e.message); return; }
    if (!res.ok) { setMsg(d.error || "실패"); return; }
    setPreview(d);
    if (action === "create") {
      setMsg("인연 카드 발송 완료 — 양쪽에 인연함 링크를 카톡으로 보내세요.");
      const mr = await fetch("/api/admin/match", { headers: { "x-admin-key": key } });
      setMatches((await mr.json()).matches);
    } else {
      setMsg(`궁합 ${d.grade} (${d.score}점)`);
    }
  };

  const togglePaidM = async (matchId, field, val) => {
    await fetch("/api/admin/match", {
      method: "PATCH",
      headers: { "content-type": "application/json", "x-admin-key": key },
      body: JSON.stringify({ matchId, [field]: val }),
    });
    setMatches((ms) => ms.map((m) => (m.id === matchId ? { ...m, [field === "aPaid" ? "a_paid" : "b_paid"]: val } : m)));
  };

  const genReport = async (id) => {
    setBusy((b) => ({ ...b, [id]: true }));
    setMsg("");
    try {
      const res = await fetch("/api/admin/report", {
        method: "POST",
        headers: { "content-type": "application/json", "x-admin-key": key },
        body: JSON.stringify({ leadId: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "생성 실패");
      setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, token: data.token, report: l.report || { __done: true } } : l)));
      setMsg(data.reused ? "기존 리포트 재사용" : `리포트 생성 완료${data.failed?.length ? ` (실패 섹션: ${data.failed.join(",")})` : ""}`);
    } catch (e) {
      setMsg(e.message);
    }
    setBusy((b) => ({ ...b, [id]: false }));
  };

  const togglePaid = async (id, paid) => {
    await fetch("/api/admin/leads", {
      method: "PATCH",
      headers: { "content-type": "application/json", "x-admin-key": key },
      body: JSON.stringify({ id, paid }),
    });
    setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, paid } : l)));
    // 자동화 체인: 결제 확인 → 리포트 생성 → 문자 발송까지 이 체크 하나로 끝
    if (paid) {
      const lead = (leads || []).find((l) => l.id === id);
      if (lead && !lead.report && !busy[id]) genReport(id);
    }
  };

  const copy = (text, label) => {
    navigator.clipboard.writeText(text);
    setMsg(label + " 복사됨");
  };

  const reportUrl = (token) => `${window.location.origin}/r/${token}`;
  const kakaoMsg = (l) =>
    `[${CONFIG.BRAND}] ${l.name}님, 월하노인의 인연 감정서가 완성되었습니다. 아래 링크에서 확인해주세요 (본인 전용): ${reportUrl(l.token)} — 궁금한 점은 이 문자에 회신해주세요.`;
  const smsHref = (phone, body) => `sms:${(phone || "").replace(/[^0-9+]/g, "")}?body=${encodeURIComponent(body)}`;
  const cardMsg = (name, token) =>
    `[${CONFIG.BRAND}] ${name}님, 월하노인이 인연 카드를 보냈습니다. 인연함에서 확인해주세요 (본인 전용): ${typeof window !== "undefined" ? window.location.origin : ""}/m/${token}`;
  const matchedMsg = (name, token) =>
    `[${CONFIG.BRAND}] ${name}님, 붉은 실이 이어졌습니다! 인연함에서 성사 안내를 확인해주세요: ${typeof window !== "undefined" ? window.location.origin : ""}/m/${token}`;

  return (
    <main className="wrap" style={{ paddingTop: 40, paddingBottom: 80 }}>
      <div className="eyebrow">관리자</div>
      <h1 className="display" style={{ fontSize: 24, margin: "10px 0 20px", color: "var(--tx)" }}>디비 관리</h1>

      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <input
          type="password"
          placeholder="관리자 키"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          style={{ flex: 1, padding: 12, background: "rgba(139,108,255,0.08)", border: "1px solid rgba(196,176,255,0.35)", color: "var(--tx)", fontSize: 15 }}
        />
        <button className="btn" style={{ width: "auto", padding: "12px 22px" }} onClick={load}>불러오기</button>
      </div>
      {msg && <p className="mono" style={{ fontSize: 13, color: "var(--amethyst-hi)", marginBottom: 14 }}>{msg}</p>}

      {funnel && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h2 className="display" style={{ fontSize: 18, color: "var(--tx)", marginBottom: 4 }}>고객 여정 깔때기</h2>
          <p className="mono" style={{ fontSize: 11, color: "var(--tx-dim)", marginBottom: 12 }}>
            상단 퍼널(노출→클릭→랜딩→스크롤→문답)은 Meta 광고관리자 + Vercel Analytics에서:
            방문수 → sec_why/royal/ask/170x/proof/final(스크롤 생존) → cta_start → step_1~6 → lead_submitted → diag_view → cta_pay_page → pay_view → pay_click/kakao_click
          </p>
          {(() => {
            const base = funnel[0]?.n || 0;
            return funnel.map((f, i) => {
              const prev = i === 0 ? null : funnel[i - 1].n;
              const pctBase = base ? Math.round((f.n / base) * 100) : 0;
              const pctPrev = prev ? Math.round((f.n / prev) * 100) : null;
              return (
                <div key={f.id} style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 3 }}>
                    <span style={{ color: "var(--tx)" }}>{f.label}</span>
                    <span className="mono" style={{ color: "var(--amethyst-hi)" }}>
                      {f.n}{f.unit || "명"}
                      {pctPrev != null && <span style={{ color: "var(--tx-dim)" }}> · 직전 대비 {pctPrev}%</span>}
                    </span>
                  </div>
                  <div style={{ height: 7, background: "rgba(139,108,255,0.12)", borderRadius: 4, overflow: "hidden" }}>
                    <i style={{ display: "block", height: "100%", width: `${Math.max(pctBase, f.n > 0 ? 3 : 0)}%`, background: i < 5 ? "var(--amethyst-hi, #b39dff)" : "#ff8b98" }} />
                  </div>
                </div>
              );
            });
          })()}
        </div>
      )}

      {leads && matches !== null && (() => {
        const todo = {
          입금주장: leads.filter((l) => l.pay_claim && !l.paid).length,
          입금대기: leads.filter((l) => !l.paid && !l.report).length,
          리포트생성: leads.filter((l) => l.paid && !l.report).length,
          문자발송_성사: (matches || []).filter((m) => m.a_accept === true && m.b_accept === true && !(m.kakao_a && m.kakao_b)).length,
          응답대기_카드: (matches || []).filter((m) => m.a_accept == null || m.b_accept == null).length,
        };
        return (
          <div className="card" style={{ marginBottom: 16, border: "1px solid rgba(255,212,121,.4)" }}>
            <p className="mono" style={{ fontSize: 10.5, letterSpacing: ".2em", color: "var(--gold)", marginBottom: 8 }}>오늘 할 일</p>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 13.5 }}>
              <span>💰 입금했다는 분 <b style={{ color: todo.입금주장 ? "#ffd479" : "var(--tx-dim)" }}>{todo.입금주장}</b></span>
              <span>입금 확인 대기 <b style={{ color: todo.입금대기 ? "var(--gold)" : "var(--tx-dim)" }}>{todo.입금대기}</b></span>
              <span>리포트 생성할 것 <b style={{ color: todo.리포트생성 ? "var(--gold)" : "var(--tx-dim)" }}>{todo.리포트생성}</b></span>
              <span>성사 문자 보낼 것 <b style={{ color: todo.문자발송_성사 ? "var(--thread)" : "var(--tx-dim)" }}>{todo.문자발송_성사}</b></span>
              <span>응답 대기 카드 <b style={{ color: "var(--tx-dim)" }}>{todo.응답대기_카드}</b></span>
            </div>
            <p style={{ fontSize: 11.5, color: "var(--tx-dim)", marginTop: 8 }}>순서: 입금 확인(체크) → 리포트 생성 → [문자 보내기]로 링크 발송. 성사 건은 매일 밤 11시 전에 양쪽에 문자.</p>
          </div>
        );
      })()}
      {leads && leads.length === 0 && <p style={{ color: "var(--tx-dim)" }}>아직 들어온 디비가 없습니다.</p>}

      {leads && leads.length > 0 && (
        <input
          className="field"
          placeholder="🔍 검색 — 이름 · 전화번호 · 주문코드"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ marginBottom: 12 }}
        />
      )}
      {leads && filterLeads(leads, q).map((l) => {
        const b = l.birth || {};
        return (
          <div className="card" key={l.id} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
              <div>
                <input type="checkbox" checked={sel.includes(l.id)} onChange={() => toggleSel(l.id)} style={{ marginRight: 8 }} />
                <b style={{ fontSize: 17, color: "var(--amethyst-hi)" }}>{l.name}</b>
                {l.token && (
                  <button className="mono" onClick={() => copy(l.token.slice(0, 6).toUpperCase(), "주문코드")}
                    style={{ fontSize: 10.5, marginLeft: 8, color: "var(--gold)", border: "1px solid rgba(255,212,121,.5)", background: "transparent", borderRadius: 6, padding: "1px 6px", cursor: "pointer" }}>
                    {l.token.slice(0, 6).toUpperCase()}
                  </button>
                )}
                {l.pay_claim && !l.paid && (
                  <span className="mono" style={{ fontSize: 10.5, marginLeft: 6, color: "#ffd479", border: "1px solid #ffd479", borderRadius: 6, padding: "1px 6px" }}>
                    💰 {l.pay_claim.method === "toss" ? "토스" : "무통장"} {(Number(l.pay_claim.price) || 0).toLocaleString("ko-KR")}원
                    {l.pay_claim.at ? ` · ${new Date(l.pay_claim.at).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}` : ""}
                  </span>
                )}
                {l.match_optin && <span className="mono" style={{ fontSize: 10, marginLeft: 8, color: "var(--thread)", border: "1px solid var(--thread)", borderRadius: 6, padding: "1px 6px" }}>紅線신청</span>}
                <span className="mono" style={{ fontSize: 13, marginLeft: 10, color: "var(--tx)" }}>{l.phone}</span>
              </div>
              <span className="mono" style={{ fontSize: 11, color: "var(--tx-dim)" }}>
                {new Date(l.created_at).toLocaleString("ko-KR")}
              </span>
            </div>
            <p className="mono" style={{ fontSize: 12.5, color: "var(--tx-dim)", margin: "8px 0" }}>
              {b.y}.{b.m}.{b.d} · {b.slot || "-"} · {b.gender === "M" ? "남" : "여"} ·{l.quiz_hits ? ` 상품${l.quiz_hits}단 ·` : ""}
              {l.sal_names?.length ? l.sal_names.join(" · ") : "-"}
            </p>
            {b.utm?.utm_source && (
              <p className="mono" style={{ fontSize: 10.5, color: "var(--gold)", margin: "2px 0 6px" }}>
                유입: {[b.utm.utm_source, b.utm.utm_medium, b.utm.utm_campaign, b.utm.utm_content].filter(Boolean).join(" / ")}
              </p>
            )}
            {b.concern && <p style={{ fontSize: 13, color: "var(--tx)", background: "rgba(139,108,255,0.08)", border: "1px solid rgba(196,176,255,0.3)", borderRadius: 10, padding: "8px 12px", margin: "6px 0 10px" }}>고민: {b.concern}</p>}
            {l.intro && <p style={{ fontSize: 13, color: "var(--tx)", background: "rgba(255,77,94,0.08)", border: "1px solid rgba(255,120,134,0.3)", borderRadius: 10, padding: "8px 12px", margin: "6px 0 10px" }}>紅線 자기소개: {l.intro}</p>}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13, color: l.paid ? "var(--amethyst-hi)" : "var(--tx-dim)" }}>
                <input type="checkbox" checked={!!l.paid} onChange={(e) => togglePaid(l.id, e.target.checked)} />
                결제 확인{!l.report && " (체크 = 생성·문자 자동)"}
              </label>
              {!l.report ? (
                <button className="btn btn-seal" style={{ width: "auto", padding: "9px 16px", fontSize: 14 }} disabled={busy[l.id]} onClick={() => genReport(l.id)}>
                  {busy[l.id] ? "생성 중… (30초)" : "리포트 생성"}
                </button>
              ) : (
                <>
                  <button className="btn btn-ghost" style={{ width: "auto", padding: "9px 14px", fontSize: 13 }} onClick={() => copy(reportUrl(l.token), "링크")}>링크 복사</button>
                  <button className="btn btn-ghost" style={{ width: "auto", padding: "9px 14px", fontSize: 13 }} onClick={() => copy(kakaoMsg(l), "문자 문구")}>문자 문구 복사</button>
                  <a className="btn btn-ghost" style={{ width: "auto", padding: "9px 14px", fontSize: 13, textDecoration: "none" }} href={smsHref(l.phone, kakaoMsg(l))}>문자 보내기 ↗</a>
                  <a className="mono" style={{ fontSize: 12, color: "var(--amethyst-hi)" }} href={`/r/${l.token}`} target="_blank" rel="noreferrer">열람 ↗</a>
                </>
              )}
            </div>
          </div>
        );
      })}
      {leads && (
        <>
          <hr className="divider" />
          <h2 className="display" style={{ fontSize: 19, margin: "6px 0 12px", color: "var(--tx)" }}>紅線 매칭 운영</h2>
          <p style={{ fontSize: 12.5, color: "var(--tx-dim)", marginBottom: 10 }}>
            위 목록에서 2명을 체크 → 궁합 확인 → 인연 카드 발송. 발송 후 아래 매칭 목록의 [문자] 버튼으로 양쪽에 알리세요. (프로필 미작성자도 발송 가능 — 카드를 열 때 프로필을 만들게 됩니다)
          </p>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <button className="btn btn-ghost" style={{ width: "auto", padding: "10px 16px", fontSize: 13 }} onClick={() => matchAction("preview")}>궁합 확인</button>
            <button className="btn btn-seal" style={{ width: "auto", padding: "10px 16px", fontSize: 13 }} onClick={() => matchAction("create")}>인연 카드 발송</button>
          </div>
          {preview && (
            <div className="card" style={{ marginBottom: 14 }}>
              <p className="mono" style={{ fontSize: 12, color: "var(--gold)" }}>{preview.grade} · {preview.score}점 {preview.aName && `· ${preview.aName} ↔ ${preview.bName}`}</p>
              <p style={{ fontSize: 13.5, marginTop: 6 }}>{preview.note}</p>
              {preview.aToken && (
                <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button className="btn btn-ghost" style={{ width: "auto", padding: "8px 12px", fontSize: 12 }} onClick={() => copy(`${window.location.origin}/m/${preview.aToken}`, "A 인연함 링크")}>A 링크 복사</button>
                  <button className="btn btn-ghost" style={{ width: "auto", padding: "8px 12px", fontSize: 12 }} onClick={() => copy(`${window.location.origin}/m/${preview.bToken}`, "B 인연함 링크")}>B 링크 복사</button>
                </div>
              )}
            </div>
          )}
          {matches && matches.length > 0 && (
            <div>
              {matches.map((m) => (
                <div className="card" key={m.id} style={{ marginBottom: 10, padding: "14px 16px" }}>
                  <p className="mono" style={{ fontSize: 11, color: "var(--tx-dim)" }}>
                    {m.aName} ↔ {m.bName} · {new Date(m.created_at).toLocaleString("ko-KR")} · {m.a_accept === true && m.b_accept === true ? "성사 ✓" : m.a_accept === false || m.b_accept === false ? "거절" : "응답 대기"}
                    {" · A응답:" + (m.a_accept == null ? "—" : m.a_accept ? "수락" : "거절")}
                    {" · B응답:" + (m.b_accept == null ? "—" : m.b_accept ? "수락" : "거절")}
                  </p>
                  <p style={{ fontSize: 12.5, margin: "4px 0 8px", color: "var(--tx-dim)" }}>{m.note}</p>
                  <div style={{ display: "flex", gap: 14, fontSize: 13 }}>
                    <label style={{ display: "flex", gap: 5, alignItems: "center" }}>
                      <input type="checkbox" checked={!!m.a_paid} onChange={(e) => togglePaidM(m.id, "aPaid", e.target.checked)} /> A 성사비
                    </label>
                    <label style={{ display: "flex", gap: 5, alignItems: "center" }}>
                      <input type="checkbox" checked={!!m.b_paid} onChange={(e) => togglePaidM(m.id, "bPaid", e.target.checked)} /> B 성사비
                    </label>
                    <a className="mono" style={{ fontSize: 11, color: "var(--amethyst-hi)", textDecoration: "underline" }}
                      href={smsHref(m.aPhone, (m.a_accept && m.b_accept ? matchedMsg(m.aName, m.aToken) : cardMsg(m.aName, m.aToken)))}>A 문자↗</a>
                    <a className="mono" style={{ fontSize: 11, color: "var(--amethyst-hi)", textDecoration: "underline" }}
                      href={smsHref(m.bPhone, (m.a_accept && m.b_accept ? matchedMsg(m.bName, m.bToken) : cardMsg(m.bName, m.bToken)))}>B 문자↗</a>
                    {m.kakao_a && <span className="mono" style={{ fontSize: 11, color: "var(--gold)" }}>A카톡:{m.kakao_a}</span>}
                    {m.kakao_b && <span className="mono" style={{ fontSize: 11, color: "var(--gold)" }}>B카톡:{m.kakao_b}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}
