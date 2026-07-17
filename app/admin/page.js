"use client";
// ============================================================
// /admin — 운영 콕핏 (ADMIN_KEY로 접근)
// 탭: 📊 대시보드(KPI·퍼널·오늘 할 일) / 👤 리드 / 🧧 매칭
// 자동화: 결제확인 체크 = 리포트 생성 + 문자 발송까지 체인
// ============================================================
import { useState, useEffect } from "react";
import { CONFIG } from "../../lib/content";

const todayKST = () => new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
const isTodayKST = (iso) => iso && new Date(new Date(iso).getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10) === todayKST();
const won = (n) => (Number(n) || 0).toLocaleString("ko-KR") + "원";

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

const LEAD_FILTERS = [
  { id: "all", label: "전체" },
  { id: "claim", label: "💰 입금주장" },
  { id: "wait", label: "입금대기" },
  { id: "sent", label: "발송완료" },
  { id: "optin", label: "紅線신청" },
];
function applyLeadFilter(leads, f) {
  if (f === "claim") return leads.filter((l) => l.pay_claim && !l.paid);
  if (f === "wait") return leads.filter((l) => !l.paid && !l.report);
  if (f === "sent") return leads.filter((l) => l.report);
  if (f === "optin") return leads.filter((l) => l.match_optin);
  return leads;
}

export default function Admin() {
  const [key, setKey] = useState("");
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState("dash");
  const [leads, setLeads] = useState(null);
  const [q, setQ] = useState("");
  const [leadFilter, setLeadFilter] = useState("all");
  const [busy, setBusy] = useState({});
  const [msg, setMsg] = useState("");
  const [sel, setSel] = useState([]); // 매칭용 선택 (최대 2)
  const [preview, setPreview] = useState(null);
  const [matches, setMatches] = useState(null);
  const [funnel, setFunnel] = useState(null);

  const loadWith = async (k) => {
    setMsg("불러오는 중...");
    const res = await fetch("/api/admin/leads", { headers: { "x-admin-key": k } });
    const data = await res.json();
    if (!res.ok) { setMsg(data.error || "불러오기 실패"); setAuthed(false); try { localStorage.removeItem("hs_admin_key"); } catch (e) {} return; }
    setLeads(data.leads);
    setAuthed(true);
    setMsg("");
    try { localStorage.setItem("hs_admin_key", k); } catch (e) {}
    const mr = await fetch("/api/admin/match", { headers: { "x-admin-key": k } });
    const md = await mr.json();
    if (mr.ok) setMatches(md.matches);
    const fr = await fetch("/api/admin/funnel", { headers: { "x-admin-key": k } });
    const fd = await fr.json();
    if (fr.ok) setFunnel(fd.funnel);
  };
  const load = () => loadWith(key);

  // 자동 로그인 — 이 기기에서 한 번 인증했으면 바로 콕핏 진입
  useEffect(() => {
    try {
      const saved = localStorage.getItem("hs_admin_key");
      if (saved) { setKey(saved); loadWith(saved); }
    } catch (e) {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      setMsg("인연 카드 발송 완료 — 매칭 탭에서 [문자]로 양쪽에 알리세요.");
      setTab("match");
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
    `[${CONFIG.BRAND}] ${l.name}님, 홍서 아씨의 감정서가 완성됐어요. 아래 링크에서 확인해주세요 (본인 전용): ${reportUrl(l.token)} — 궁금한 점은 이 문자에 회신해주세요.`;
  const smsHref = (phone, body) => `sms:${(phone || "").replace(/[^0-9+]/g, "")}?body=${encodeURIComponent(body)}`;
  const cardMsg = (name, token) =>
    `[${CONFIG.BRAND}] ${name}님, 홍서 아씨가 인연 카드를 보냈어요. 인연함에서 확인해주세요 (본인 전용): ${typeof window !== "undefined" ? window.location.origin : ""}/m/${token}`;
  const matchedMsg = (name, token) =>
    `[${CONFIG.BRAND}] ${name}님, 붉은 실이 이어졌습니다! 인연함에서 성사 안내를 확인해주세요: ${typeof window !== "undefined" ? window.location.origin : ""}/m/${token}`;

  // ── 파생 지표 ──
  const kpi = (() => {
    if (!leads) return null;
    const paidLeads = leads.filter((l) => l.paid);
    const revAll = paidLeads.reduce((s, l) => s + (Number(l.pay_claim?.price) || 0), 0);
    const revToday = paidLeads.filter((l) => isTodayKST(l.pay_claim?.at)).reduce((s, l) => s + (Number(l.pay_claim?.price) || 0), 0);
    const rated = leads.filter((l) => l.rating);
    return {
      newToday: leads.filter((l) => isTodayKST(l.created_at)).length,
      revToday,
      revAll,
      sent: leads.filter((l) => l.report).length,
      rating: rated.length ? (rated.reduce((s, l) => s + l.rating, 0) / rated.length).toFixed(1) : "—",
      ratedN: rated.length,
      couples: (matches || []).filter((m) => m.a_accept === true && m.b_accept === true).length,
    };
  })();

  const todo = leads && {
    입금주장: leads.filter((l) => l.pay_claim && !l.paid).length,
    입금대기: leads.filter((l) => !l.paid && !l.report).length,
    리포트생성: leads.filter((l) => l.paid && !l.report).length,
    문자발송_성사: (matches || []).filter((m) => m.a_accept === true && m.b_accept === true && !(m.kakao_a && m.kakao_b)).length,
    응답대기_카드: (matches || []).filter((m) => m.a_accept == null || m.b_accept == null).length,
  };

  const jumpLeads = (f) => { setLeadFilter(f); setTab("leads"); };

  const selNames = sel.map((id) => (leads || []).find((l) => l.id === id)?.name).filter(Boolean);

  const kpiCard = (label, value, sub, color) => (
    <div className="card" style={{ padding: "14px 16px" }}>
      <p className="mono" style={{ fontSize: 10.5, letterSpacing: ".15em", color: "var(--tx-dim)", marginBottom: 6 }}>{label}</p>
      <p style={{ fontSize: 22, fontWeight: 700, color: color || "var(--tx)" }}>{value}</p>
      {sub && <p className="mono" style={{ fontSize: 10.5, color: "var(--tx-dim)", marginTop: 3 }}>{sub}</p>}
    </div>
  );

  const tabBtn = (id, label, badge) => (
    <button
      onClick={() => setTab(id)}
      style={{
        flex: 1, padding: "11px 6px", fontSize: 14, cursor: "pointer", borderRadius: 10,
        border: tab === id ? "1px solid rgba(196,176,255,.6)" : "1px solid rgba(196,176,255,.18)",
        background: tab === id ? "rgba(139,108,255,.16)" : "transparent",
        color: tab === id ? "var(--amethyst-hi)" : "var(--tx-dim)", fontWeight: tab === id ? 700 : 400,
      }}
    >
      {label}{badge ? <span style={{ marginLeft: 5, fontSize: 11, color: "#ffd479" }}>{badge}</span> : null}
    </button>
  );

  return (
    <main className="wrap" style={{ paddingTop: 40, paddingBottom: 110 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div className="eyebrow">관리자</div>
          <h1 className="display" style={{ fontSize: 24, margin: "8px 0 16px", color: "var(--tx)" }}>홍서당 콕핏</h1>
        </div>
        {authed && (
          <button className="btn btn-ghost" style={{ width: "auto", padding: "8px 14px", fontSize: 12 }} onClick={load}>↻ 새로고침</button>
        )}
      </div>

      {!authed && (
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <input
            type="password"
            placeholder="관리자 키"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
            style={{ flex: 1, padding: 12, background: "rgba(139,108,255,0.08)", border: "1px solid rgba(196,176,255,0.35)", color: "var(--tx)", fontSize: 15 }}
          />
          <button className="btn" style={{ width: "auto", padding: "12px 22px" }} onClick={load}>입장</button>
        </div>
      )}
      {msg && <p className="mono" style={{ fontSize: 13, color: "var(--amethyst-hi)", marginBottom: 14 }}>{msg}</p>}

      {authed && leads && (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {tabBtn("dash", "📊 대시보드")}
            {tabBtn("leads", "👤 리드", todo && todo.입금주장 ? `💰${todo.입금주장}` : null)}
            {tabBtn("match", "🧧 매칭", todo && todo.문자발송_성사 ? todo.문자발송_성사 : null)}
          </div>

          {/* ───────────────── 📊 대시보드 ───────────────── */}
          {tab === "dash" && (
            <>
              {kpi && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                  {kpiCard("오늘 신규 리드", `${kpi.newToday}명`, `누적 ${leads.length}명`)}
                  {kpiCard("오늘 매출", won(kpi.revToday), "결제확인 + 접수시각 기준", "#ffd479")}
                  {kpiCard("누적 매출", won(kpi.revAll), "결제확인 완료분", "#ffd479")}
                  {kpiCard("감정서 발송", `${kpi.sent}건`, null, "var(--amethyst-hi)")}
                  {kpiCard("평균 별점", kpi.rating === "—" ? "—" : `★ ${kpi.rating}`, `응답 ${kpi.ratedN}명`, "var(--gold)")}
                  {kpiCard("성사 커플", `${kpi.couples}쌍`, null, "var(--thread)")}
                </div>
              )}

              {todo && (
                <div className="card" style={{ marginBottom: 16, border: "1px solid rgba(255,212,121,.4)" }}>
                  <p className="mono" style={{ fontSize: 10.5, letterSpacing: ".2em", color: "var(--gold)", marginBottom: 10 }}>오늘 할 일 — 누르면 바로 이동</p>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button className="btn btn-ghost" style={{ width: "auto", padding: "8px 12px", fontSize: 13, color: todo.입금주장 ? "#ffd479" : "var(--tx-dim)" }} onClick={() => jumpLeads("claim")}>💰 입금했다는 분 {todo.입금주장}</button>
                    <button className="btn btn-ghost" style={{ width: "auto", padding: "8px 12px", fontSize: 13, color: todo.입금대기 ? "var(--gold)" : "var(--tx-dim)" }} onClick={() => jumpLeads("wait")}>입금 확인 대기 {todo.입금대기}</button>
                    <button className="btn btn-ghost" style={{ width: "auto", padding: "8px 12px", fontSize: 13, color: todo.문자발송_성사 ? "var(--thread)" : "var(--tx-dim)" }} onClick={() => setTab("match")}>성사 문자 보낼 것 {todo.문자발송_성사}</button>
                    <button className="btn btn-ghost" style={{ width: "auto", padding: "8px 12px", fontSize: 13, color: "var(--tx-dim)" }} onClick={() => setTab("match")}>응답 대기 카드 {todo.응답대기_카드}</button>
                  </div>
                  <p style={{ fontSize: 11.5, color: "var(--tx-dim)", marginTop: 10 }}>흐름: 통장 알림 → 💰 목록에서 금액·시각 대조 → [결제 확인] 체크 (리포트 생성·문자까지 자동)</p>
                </div>
              )}

              {funnel && (
                <div className="card" style={{ marginBottom: 20 }}>
                  <h2 className="display" style={{ fontSize: 18, color: "var(--tx)", marginBottom: 4 }}>고객 여정 깔때기</h2>
                  <p className="mono" style={{ fontSize: 11, color: "var(--tx-dim)", marginBottom: 12 }}>
                    상단 퍼널(방문→스크롤→문답)은 Meta 광고관리자 + Vercel Analytics 이벤트로 확인
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
            </>
          )}

          {/* ───────────────── 👤 리드 ───────────────── */}
          {tab === "leads" && (
            <>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                {LEAD_FILTERS.map((f) => (
                  <button key={f.id} onClick={() => setLeadFilter(f.id)}
                    style={{
                      padding: "6px 12px", fontSize: 12.5, borderRadius: 20, cursor: "pointer",
                      border: leadFilter === f.id ? "1px solid rgba(255,212,121,.6)" : "1px solid rgba(196,176,255,.25)",
                      background: leadFilter === f.id ? "rgba(255,212,121,.12)" : "transparent",
                      color: leadFilter === f.id ? "#ffd479" : "var(--tx-dim)",
                    }}>
                    {f.label} {applyLeadFilter(leads, f.id).length}
                  </button>
                ))}
              </div>
              <input
                className="field"
                placeholder="🔍 검색 — 이름 · 전화번호 · 주문코드"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                style={{ marginBottom: 12 }}
              />
              {leads.length === 0 && <p style={{ color: "var(--tx-dim)" }}>아직 들어온 디비가 없습니다.</p>}
              {filterLeads(applyLeadFilter(leads, leadFilter), q).map((l) => {
                const b = l.birth || {};
                return (
                  <div className="card" key={l.id} style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                      <div>
                        <input type="checkbox" checked={sel.includes(l.id)} onChange={() => toggleSel(l.id)} style={{ marginRight: 8 }} title="매칭용 선택" />
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
                        {l.rating && <span className="mono" style={{ fontSize: 10.5, marginLeft: 6, color: "var(--gold)" }}>★{l.rating}</span>}
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
            </>
          )}

          {/* ───────────────── 🧧 매칭 ───────────────── */}
          {tab === "match" && (
            <>
              <p style={{ fontSize: 12.5, color: "var(--tx-dim)", marginBottom: 10 }}>
                수동 매칭: 리드 탭에서 2명 체크 → 하단 바의 [궁합 확인]/[카드 발송]. 자동 매칭·카드 알림은 매일 저녁 크론이 처리합니다. (프로필 미작성자도 발송 가능 — 카드를 열 때 프로필을 만들게 됩니다)
              </p>
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
              {(!matches || matches.length === 0) && <p style={{ color: "var(--tx-dim)" }}>아직 매칭이 없습니다.</p>}
              {matches && matches.map((m) => (
                <div className="card" key={m.id} style={{ marginBottom: 10, padding: "14px 16px" }}>
                  <p className="mono" style={{ fontSize: 11, color: "var(--tx-dim)" }}>
                    {m.aName} ↔ {m.bName} · {new Date(m.created_at).toLocaleString("ko-KR")} · {m.a_accept === true && m.b_accept === true ? "성사 ✓" : m.a_accept === false || m.b_accept === false ? "거절" : "응답 대기"}
                    {" · A응답:" + (m.a_accept == null ? "—" : m.a_accept ? "수락" : "거절")}
                    {" · B응답:" + (m.b_accept == null ? "—" : m.b_accept ? "수락" : "거절")}
                  </p>
                  <p style={{ fontSize: 12.5, margin: "4px 0 8px", color: "var(--tx-dim)" }}>{m.note}</p>
                  <div style={{ display: "flex", gap: 14, fontSize: 13, flexWrap: "wrap" }}>
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
            </>
          )}

          {/* ── 매칭용 선택 플로팅 바 (어느 탭에서든 2명 채우면 바로 발사) ── */}
          {sel.length > 0 && (
            <div style={{
              position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 50,
              background: "rgba(12,10,34,.96)", borderTop: "1px solid rgba(196,176,255,.35)",
              padding: "10px 14px", display: "flex", gap: 8, alignItems: "center", justifyContent: "center", flexWrap: "wrap",
            }}>
              <span className="mono" style={{ fontSize: 12, color: "var(--tx)" }}>
                선택 {sel.length}/2 — {selNames.join(" ↔ ") || ""}
              </span>
              <button className="btn btn-ghost" style={{ width: "auto", padding: "8px 14px", fontSize: 12.5 }} disabled={sel.length !== 2} onClick={() => matchAction("preview")}>궁합 확인</button>
              <button className="btn btn-seal" style={{ width: "auto", padding: "8px 14px", fontSize: 12.5 }} disabled={sel.length !== 2} onClick={() => matchAction("create")}>인연 카드 발송</button>
              <button className="btn btn-ghost" style={{ width: "auto", padding: "8px 10px", fontSize: 12.5 }} onClick={() => setSel([])}>✕</button>
            </div>
          )}
        </>
      )}
    </main>
  );
}
