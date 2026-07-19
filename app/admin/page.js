"use client";
// ============================================================
// /admin — 운영 콕핏 (ADMIN_KEY로 접근)
// 탭: 📊 대시보드 / 👤 리드 / 🧧 매칭 / 📨 SMS
// ============================================================
import { useState, useEffect } from "react";
import CompanySwitcher from "../company-switcher"; // 디깅코퍼레이션 사업체 스위처
import { CONFIG } from "../../lib/content";

const todayKST = () => new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
const isTodayKST = (iso) => iso && new Date(new Date(iso).getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10) === todayKST();
const won = (n) => (Number(n) || 0).toLocaleString("ko-KR") + "원";

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

// 스타일 토큰 — 어드민 전용 (라이트 고정)
const C = {
  bg: "#ffffff",
  bgSub: "#f8fafc",
  border: "#e2e8f0",
  text: "#0f172a",
  dim: "#64748b",
  accent: "#7c3aed",
  accentBg: "#ede9fe",
  green: "#059669",
  greenBg: "#dcfce7",
  red: "#dc2626",
  redBg: "#fee2e2",
  gold: "#b45309",
  goldBg: "#fef3c7",
  blue: "#1d4ed8",
  blueBg: "#dbeafe",
};
const card = { background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 18px", marginBottom: 12 };
const chip = (active) => ({
  padding: "5px 12px", fontSize: 12.5, borderRadius: 20, cursor: "pointer",
  border: `1px solid ${active ? C.accent : C.border}`,
  background: active ? C.accentBg : C.bgSub,
  color: active ? C.accent : C.dim, fontWeight: active ? 600 : 400,
});
const btn = (variant = "ghost") => {
  if (variant === "primary") return { padding: "9px 16px", fontSize: 13, borderRadius: 8, cursor: "pointer", border: "none", background: C.accent, color: "#fff", fontWeight: 600 };
  if (variant === "danger") return { padding: "9px 16px", fontSize: 13, borderRadius: 8, cursor: "pointer", border: `1px solid ${C.red}`, background: C.redBg, color: C.red, fontWeight: 600 };
  return { padding: "9px 16px", fontSize: 13, borderRadius: 8, cursor: "pointer", border: `1px solid ${C.border}`, background: C.bgSub, color: C.text, fontWeight: 500 };
};
const label = { fontSize: 11, fontWeight: 600, letterSpacing: ".1em", color: C.dim, textTransform: "uppercase", marginBottom: 6 };

export default function Admin() {
  const [key, setKey] = useState("");
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState("dash");
  const [leads, setLeads] = useState(null);
  const [q, setQ] = useState("");
  const [leadFilter, setLeadFilter] = useState("all");
  const [busy, setBusy] = useState({});
  const [msg, setMsg] = useState("");
  const [sel, setSel] = useState([]);
  const [preview, setPreview] = useState(null);
  const [matches, setMatches] = useState(null);
  const [funnel, setFunnel] = useState(null);
  const [sms, setSms] = useState(null);

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
    const sr = await fetch("/api/admin/sms", { headers: { "x-admin-key": k } });
    const sd = await sr.json();
    setSms(sr.ok ? sd : { error: sd.error || "조회 실패" });
  };
  const load = () => loadWith(key);

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
    if (paid) {
      const lead = (leads || []).find((l) => l.id === id);
      if (lead && !lead.report && !busy[id]) genReport(id);
    }
  };

  const copy = (text, label) => { navigator.clipboard.writeText(text); setMsg(label + " 복사됨"); };
  const reportUrl = (token) => `${window.location.origin}/r/${token}`;
  const kakaoMsg = (l) =>
    `[${CONFIG.BRAND}] ${l.name}님, 홍서 아씨의 감정서가 완성됐어요. 아래 링크에서 확인해주세요 (본인 전용): ${reportUrl(l.token)} — 궁금한 점은 이 문자에 회신해주세요.`;
  const smsHref = (phone, body) => `sms:${(phone || "").replace(/[^0-9+]/g, "")}?body=${encodeURIComponent(body)}`;
  const cardMsg = (name, token) =>
    `[${CONFIG.BRAND}] ${name}님, 홍서 아씨가 인연 카드를 보냈어요. 인연함에서 확인해주세요 (본인 전용): ${typeof window !== "undefined" ? window.location.origin : ""}/m/${token}`;
  const matchedMsg = (name, token) =>
    `[${CONFIG.BRAND}] ${name}님, 붉은 실이 이어졌습니다! 인연함에서 성사 안내를 확인해주세요: ${typeof window !== "undefined" ? window.location.origin : ""}/m/${token}`;

  const kpi = (() => {
    if (!leads) return null;
    const paidLeads = leads.filter((l) => l.paid);
    const revAll = paidLeads.reduce((s, l) => s + (Number(l.pay_claim?.price) || 0), 0);
    const revToday = paidLeads.filter((l) => isTodayKST(l.pay_claim?.at)).reduce((s, l) => s + (Number(l.pay_claim?.price) || 0), 0);
    const rated = leads.filter((l) => l.rating);
    return {
      newToday: leads.filter((l) => isTodayKST(l.created_at)).length,
      revToday, revAll,
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

  // ── 탭 버튼 ──
  const TabBtn = ({ id, label: lbl, badge }) => {
    const active = tab === id;
    return (
      <button onClick={() => setTab(id)} style={{
        flex: 1, padding: "10px 6px", fontSize: 13.5, cursor: "pointer",
        background: "none", border: "none", borderBottom: `2px solid ${active ? C.accent : "transparent"}`,
        color: active ? C.accent : C.dim, fontWeight: active ? 700 : 400,
      }}>
        {lbl}{badge ? <span style={{ marginLeft: 5, background: C.red, color: "#fff", borderRadius: 10, padding: "1px 6px", fontSize: 10.5, fontWeight: 700 }}>{badge}</span> : null}
      </button>
    );
  };

  // ── KPI 카드 ──
  const KpiCard = ({ label: lbl, value, sub, color }) => (
    <div style={{ ...card, marginBottom: 0 }}>
      <p style={{ ...label, marginBottom: 4 }}>{lbl}</p>
      <p style={{ fontSize: 22, fontWeight: 700, color: color || C.text, margin: "2px 0" }}>{value}</p>
      {sub && <p style={{ fontSize: 11.5, color: C.dim, marginTop: 2 }}>{sub}</p>}
    </div>
  );

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 20px 120px" }}>

        {/* ── 헤더 ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".14em", color: C.dim, textTransform: "uppercase", marginBottom: 4 }}>관리자 콕핏</p>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: 0 }}>홍서당</h1>
          </div>
          {authed && (
            <button onClick={load} style={{ ...btn(), padding: "8px 14px", fontSize: 12.5 }}>↻ 새로고침</button>
          )}
        </div>

        {/* ── 로그인 ── */}
        {!authed && (
          <div style={{ ...card, display: "flex", gap: 10 }}>
            <input
              type="password"
              placeholder="관리자 키"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load()}
              style={{ flex: 1, padding: "11px 14px", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 15, color: C.text, background: C.bgSub, outline: "none" }}
            />
            <button onClick={load} style={{ ...btn("primary"), whiteSpace: "nowrap" }}>입장</button>
          </div>
        )}

        {msg && (
          <div style={{ background: C.accentBg, border: `1px solid ${C.accent}`, borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: C.accent }}>
            {msg}
          </div>
        )}

        {authed && leads && (
          <>
            {/* ── 사업체 스위처 (탭 바 위 우측) ── */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}><CompanySwitcher /></div>

            {/* ── 탭 바 ── */}
            <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, marginBottom: 20, gap: 0 }}>
              <TabBtn id="dash" label="📊 대시보드" />
              <TabBtn id="leads" label="👤 리드" badge={todo?.입금주장 || null} />
              <TabBtn id="match" label="🧧 매칭" badge={todo?.문자발송_성사 || null} />
              <TabBtn id="sms" label="📨 SMS" />
            </div>

            {/* ─────────────── 📊 대시보드 ─────────────── */}
            {tab === "dash" && (
              <>
                {/* KPI 그리드 */}
                {kpi && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 20 }}>
                    <KpiCard label="오늘 신규 리드" value={`${kpi.newToday}명`} sub={`누적 ${leads.length}명`} />
                    <KpiCard label="오늘 매출" value={won(kpi.revToday)} color={C.gold} />
                    <KpiCard label="누적 매출" value={won(kpi.revAll)} color={C.gold} />
                    <KpiCard label="감정서 발송" value={`${kpi.sent}건`} color={C.accent} />
                    <KpiCard label="평균 별점" value={kpi.rating === "—" ? "—" : `★ ${kpi.rating}`} sub={`응답 ${kpi.ratedN}명`} color="#ca8a04" />
                    <KpiCard label="성사 커플" value={`${kpi.couples}쌍`} color={C.red} />
                  </div>
                )}

                {/* 오늘 할 일 */}
                {todo && (
                  <div style={card}>
                    <p style={label}>오늘 할 일</p>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button style={{ ...chip(!!todo.입금주장), fontWeight: todo.입금주장 ? 700 : 400 }} onClick={() => jumpLeads("claim")}>
                        💰 입금주장 {todo.입금주장}건
                      </button>
                      <button style={chip(false)} onClick={() => jumpLeads("wait")}>
                        ⏳ 입금대기 {todo.입금대기}건
                      </button>
                      <button style={{ ...chip(!!todo.문자발송_성사), fontWeight: todo.문자발송_성사 ? 700 : 400 }} onClick={() => setTab("match")}>
                        💌 성사 문자 {todo.문자발송_성사}건
                      </button>
                      <button style={chip(false)} onClick={() => setTab("match")}>
                        ⏸ 응답 대기 {todo.응답대기_카드}건
                      </button>
                    </div>
                    <p style={{ fontSize: 11.5, color: C.dim, marginTop: 12, lineHeight: 1.6 }}>
                      흐름: 통장 알림 → 💰 입금주장 대조 → [결제 확인] 체크 → 리포트 생성·문자 자동
                    </p>
                  </div>
                )}

                {/* 퍼널 */}
                {funnel && (
                  <div style={card}>
                    <p style={label}>고객 여정 퍼널</p>
                    <p style={{ fontSize: 11.5, color: C.dim, marginBottom: 14 }}>
                      방문→스크롤→문답 상단은 Meta 광고관리자 + Vercel Analytics에서 확인
                    </p>
                    {(() => {
                      const base = funnel[0]?.n || 0;
                      return funnel.map((f, i) => {
                        const prev = i === 0 ? null : funnel[i - 1].n;
                        const pctBase = base ? Math.round((f.n / base) * 100) : 0;
                        const pctPrev = prev ? Math.round((f.n / prev) * 100) : null;
                        return (
                          <div key={f.id} style={{ marginBottom: 10 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
                              <span style={{ color: C.text }}>{f.label}</span>
                              <span style={{ color: C.accent, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                                {f.n}{f.unit || "명"}
                                {pctPrev != null && <span style={{ color: C.dim, fontWeight: 400 }}> · 직전 {pctPrev}%</span>}
                              </span>
                            </div>
                            <div style={{ height: 6, background: C.border, borderRadius: 4, overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${Math.max(pctBase, f.n > 0 ? 2 : 0)}%`, background: i < 5 ? C.accent : C.red, borderRadius: 4 }} />
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}
              </>
            )}

            {/* ─────────────── 👤 리드 ─────────────── */}
            {tab === "leads" && (
              <>
                {/* 필터 */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                  {LEAD_FILTERS.map((f) => (
                    <button key={f.id} onClick={() => setLeadFilter(f.id)} style={chip(leadFilter === f.id)}>
                      {f.label} {applyLeadFilter(leads, f.id).length}
                    </button>
                  ))}
                </div>

                {/* 검색 */}
                <input
                  placeholder="🔍 검색 — 이름 · 전화번호 · 주문코드"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  style={{ width: "100%", padding: "11px 14px", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14, color: C.text, background: C.bgSub, marginBottom: 14, boxSizing: "border-box", outline: "none" }}
                />

                {leads.length === 0 && <p style={{ color: C.dim }}>아직 리드가 없습니다.</p>}

                {filterLeads(applyLeadFilter(leads, leadFilter), q).map((l) => {
                  const b = l.birth || {};
                  return (
                    <div key={l.id} style={card}>
                      {/* 상단: 이름 + 태그 + 시각 */}
                      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <input type="checkbox" checked={sel.includes(l.id)} onChange={() => toggleSel(l.id)} title="매칭용 선택" />
                          <span style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{l.name || "—"}</span>
                          <span style={{ fontSize: 14, color: C.dim }}>{l.phone}</span>
                          {l.token && (
                            <button onClick={() => copy(l.token.slice(0, 6).toUpperCase(), "주문코드")}
                              style={{ fontSize: 11, border: `1px solid ${C.border}`, background: C.bgSub, color: C.dim, borderRadius: 6, padding: "2px 7px", cursor: "pointer" }}>
                              {l.token.slice(0, 6).toUpperCase()}
                            </button>
                          )}
                          {l.pay_claim && !l.paid && (
                            <span style={{ fontSize: 11, background: C.goldBg, color: C.gold, border: `1px solid ${C.gold}`, borderRadius: 6, padding: "2px 7px", fontWeight: 700 }}>
                              💰 {l.pay_claim.method === "toss" ? "토스" : "무통장"} {(Number(l.pay_claim.price) || 0).toLocaleString("ko-KR")}원
                              {l.pay_claim.at ? ` · ${new Date(l.pay_claim.at).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}` : ""}
                            </span>
                          )}
                          {l.rating && <span style={{ fontSize: 11, color: C.gold, fontWeight: 600 }}>★{l.rating}</span>}
                          {l.match_optin && (
                            <span style={{ fontSize: 11, background: "#fff1f2", color: C.red, border: `1px solid ${C.red}`, borderRadius: 6, padding: "2px 7px" }}>紅線</span>
                          )}
                        </div>
                        <span style={{ fontSize: 11.5, color: C.dim }}>
                          {new Date(l.created_at).toLocaleString("ko-KR")}
                        </span>
                      </div>

                      {/* 사주 정보 */}
                      <p style={{ fontSize: 12.5, color: C.dim, margin: "0 0 8px", fontVariantNumeric: "tabular-nums" }}>
                        {b.y}.{b.m}.{b.d} · {b.slot || "—"} · {b.gender === "M" ? "남" : "여"}
                        {l.quiz_hits ? ` · 상품${l.quiz_hits}단` : ""}
                        {l.sal_names?.length ? ` · ${l.sal_names.join(" · ")}` : ""}
                      </p>

                      {b.utm?.utm_source && (
                        <p style={{ fontSize: 11, color: C.blue, margin: "0 0 6px" }}>
                          유입: {[b.utm.utm_source, b.utm.utm_medium, b.utm.utm_campaign, b.utm.utm_content].filter(Boolean).join(" / ")}
                        </p>
                      )}
                      {b.concern && (
                        <p style={{ fontSize: 13, color: C.text, background: C.bgSub, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", margin: "0 0 10px" }}>
                          고민: {b.concern}
                        </p>
                      )}
                      {l.intro && (
                        <p style={{ fontSize: 13, color: C.text, background: "#fff1f2", border: `1px solid #fecdd3`, borderRadius: 8, padding: "8px 12px", margin: "0 0 10px" }}>
                          紅線 소개: {l.intro}
                        </p>
                      )}

                      {/* 액션 */}
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", paddingTop: 6, borderTop: `1px solid ${C.border}` }}>
                        <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13, color: l.paid ? C.green : C.dim, cursor: "pointer" }}>
                          <input type="checkbox" checked={!!l.paid} onChange={(e) => togglePaid(l.id, e.target.checked)} />
                          결제 확인{!l.report && " (→ 리포트·문자 자동)"}
                        </label>
                        {!l.report ? (
                          <button style={btn("primary")} disabled={busy[l.id]} onClick={() => genReport(l.id)}>
                            {busy[l.id] ? "생성 중…" : "리포트 생성"}
                          </button>
                        ) : (
                          <>
                            <button style={btn()} onClick={() => copy(reportUrl(l.token), "링크")}>링크 복사</button>
                            <button style={btn()} onClick={() => copy(kakaoMsg(l), "문자 문구")}>문자 문구</button>
                            <button style={btn()} onClick={async () => {
                              if (!window.confirm(`${l.name} (${l.phone})에게 서버에서 바로 문자를 보낼까요?`)) return;
                              try {
                                const r = await fetch("/api/admin/send", { method: "POST", headers: { "content-type": "application/json", "x-admin-key": key }, body: JSON.stringify({ to: l.phone, text: kakaoMsg(l) }) });
                                const j = await r.json();
                                window.alert(r.ok ? "발송 완료" : "실패: " + (j.error || r.status));
                              } catch (e) { window.alert("실패: " + e.message); }
                            }}>서버 발송 📨</button>
                            <a style={{ ...btn(), textDecoration: "none" }} href={smsHref(l.phone, kakaoMsg(l))}>📱 폰으로</a>
                            <a style={{ fontSize: 12.5, color: C.accent, textDecoration: "none" }} href={`/r/${l.token}`} target="_blank" rel="noreferrer">열람 ↗</a>
                            <button style={{ fontSize: 12, background: "none", border: "none", cursor: "pointer", color: l.match_optin ? C.red : C.dim, textDecoration: "underline", padding: 0 }}
                              onClick={async () => {
                                const off = !!l.match_optin;
                                if (!window.confirm(off ? `${l.name}을(를) 매칭에서 제외할까요?` : `${l.name}을(를) 매칭 풀에 복귀시킬까요?`)) return;
                                const r = await fetch("/api/admin/leads", { method: "PATCH", headers: { "content-type": "application/json", "x-admin-key": key }, body: JSON.stringify({ action: off ? "matchOff" : "matchOn", id: l.id }) });
                                if (!r.ok) { const j = await r.json(); window.alert("실패: " + (j.error || r.status)); return; }
                                load();
                              }}>{l.match_optin ? "🚫 매칭 제외" : "↩ 매칭 복귀"}</button>
                            <button style={{ fontSize: 12, background: "none", border: "none", cursor: "pointer", color: C.red, textDecoration: "underline", padding: 0 }}
                              onClick={async () => {
                                if (!window.confirm(`⚠️ ${l.name}(${l.phone}) 완전 삭제할까요?\n복구 불가.`)) return;
                                if (!window.confirm(`정말로요? [확인] 시 즉시 삭제 — ${l.name}`)) return;
                                const r = await fetch("/api/admin/leads", { method: "PATCH", headers: { "content-type": "application/json", "x-admin-key": key }, body: JSON.stringify({ action: "delete", id: l.id }) });
                                if (!r.ok) { const j = await r.json(); window.alert("실패: " + (j.error || r.status)); return; }
                                load();
                              }}>🗑 삭제</button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {/* ─────────────── 🧧 매칭 ─────────────── */}
            {tab === "match" && (
              <>
                <p style={{ fontSize: 12.5, color: C.dim, marginBottom: 14, lineHeight: 1.6 }}>
                  수동 매칭: 리드 탭에서 2명 체크 → 하단 바 [궁합 확인] / [카드 발송]<br />
                  자동 매칭·카드 알림은 매일 저녁 크론이 처리합니다.
                </p>

                {preview && (
                  <div style={{ ...card, background: C.accentBg, border: `1px solid ${C.accent}` }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: C.accent }}>{preview.grade} · {preview.score}점 {preview.aName && `· ${preview.aName} ↔ ${preview.bName}`}</p>
                    <p style={{ fontSize: 13.5, marginTop: 6, color: C.text }}>{preview.note}</p>
                    {preview.aToken && (
                      <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button style={btn()} onClick={() => copy(`${window.location.origin}/m/${preview.aToken}`, "A 링크")}>A 링크 복사</button>
                        <button style={btn()} onClick={() => copy(`${window.location.origin}/m/${preview.bToken}`, "B 링크")}>B 링크 복사</button>
                      </div>
                    )}
                  </div>
                )}

                {(!matches || matches.length === 0) && <p style={{ color: C.dim }}>아직 매칭이 없습니다.</p>}
                {matches && matches.map((m) => {
                  const matched = m.a_accept === true && m.b_accept === true;
                  const rejected = m.a_accept === false || m.b_accept === false;
                  return (
                    <div key={m.id} style={card}>
                      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{m.aName} ↔ {m.bName}</span>
                        <span style={{
                          fontSize: 11.5, fontWeight: 600, padding: "2px 8px", borderRadius: 6,
                          background: matched ? C.greenBg : rejected ? C.redBg : C.bgSub,
                          color: matched ? C.green : rejected ? C.red : C.dim,
                        }}>
                          {matched ? "성사 ✓" : rejected ? "거절" : "응답 대기"}
                        </span>
                      </div>
                      <p style={{ fontSize: 11.5, color: C.dim, marginBottom: 8 }}>
                        A응답: {m.a_accept == null ? "—" : m.a_accept ? "수락" : "거절"} ·
                        B응답: {m.b_accept == null ? "—" : m.b_accept ? "수락" : "거절"} ·
                        {new Date(m.created_at).toLocaleString("ko-KR")}
                      </p>
                      {m.note && <p style={{ fontSize: 12.5, color: C.dim, marginBottom: 10 }}>{m.note}</p>}
                      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", paddingTop: 6, borderTop: `1px solid ${C.border}` }}>
                        <label style={{ display: "flex", gap: 5, alignItems: "center", fontSize: 13, cursor: "pointer", color: m.a_paid ? C.green : C.dim }}>
                          <input type="checkbox" checked={!!m.a_paid} onChange={(e) => togglePaidM(m.id, "aPaid", e.target.checked)} /> A 성사비
                        </label>
                        <label style={{ display: "flex", gap: 5, alignItems: "center", fontSize: 13, cursor: "pointer", color: m.b_paid ? C.green : C.dim }}>
                          <input type="checkbox" checked={!!m.b_paid} onChange={(e) => togglePaidM(m.id, "bPaid", e.target.checked)} /> B 성사비
                        </label>
                        {[["A", m.aPhone, m.aName, m.aToken], ["B", m.bPhone, m.bName, m.bToken]].map(([side, ph, nm, tk]) => (
                          <button key={side} style={{ ...btn(), fontSize: 12 }} onClick={async () => {
                            const body = m.a_accept && m.b_accept ? matchedMsg(nm, tk) : cardMsg(nm, tk);
                            if (!window.confirm(`${side}측 ${nm}(${ph})에게 문자를 보낼까요?`)) return;
                            try {
                              const r = await fetch("/api/admin/send", { method: "POST", headers: { "content-type": "application/json", "x-admin-key": key }, body: JSON.stringify({ to: ph, text: body }) });
                              const j = await r.json();
                              window.alert(r.ok ? `${side} 발송 완료` : "실패: " + (j.error || r.status));
                            } catch (e) { window.alert("실패: " + e.message); }
                          }}>{side} 서버발송 📨</button>
                        ))}
                        {m.kakao_a && <span style={{ fontSize: 11.5, color: C.gold }}>A카톡:{m.kakao_a}</span>}
                        {m.kakao_b && <span style={{ fontSize: 11.5, color: C.gold }}>B카톡:{m.kakao_b}</span>}
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {/* ─────────────── 📨 SMS ─────────────── */}
            {tab === "sms" && (
              <>
                {!sms && <p style={{ color: C.dim }}>불러오는 중…</p>}
                {sms?.error && <p style={{ color: C.red }}>{sms.error}</p>}
                {sms && !sms.error && (
                  <>
                    <div style={{ ...card, background: sms.senderIssue ? C.redBg : C.bgSub, border: `1px solid ${sms.senderIssue ? C.red : C.border}`, marginBottom: 16 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: sms.senderIssue ? C.red : C.dim, marginBottom: 6 }}>
                        발신번호: {sms.sender}
                        {sms.senderIssue && " ⚠️ 미등록"}
                      </p>
                      {sms.senderIssue && (
                        <p style={{ fontSize: 12.5, color: C.red, lineHeight: 1.7 }}>
                          Solapi 콘솔 → [발신번호] 등록(휴대폰 인증) → Vercel 환경변수 SOLAPI_SENDER 교체 → Redeploy
                        </p>
                      )}
                    </div>

                    {(sms.list || []).length === 0 && <p style={{ color: C.dim }}>발송 기록이 없습니다.</p>}
                    {(sms.list || []).map((m, i) => (
                      <div key={i} style={{ display: "flex", gap: 10, fontSize: 12.5, padding: "10px 0", borderBottom: `1px solid ${C.border}`, alignItems: "baseline" }}>
                        <span style={{ color: C.dim, flexShrink: 0, fontVariantNumeric: "tabular-nums", minWidth: 90 }}>{m.at}</span>
                        <span style={{ flexShrink: 0, fontWeight: 600, minWidth: 110 }}>{m.to}</span>
                        <span style={{ color: m.fail ? C.red : C.green, flexShrink: 0, fontWeight: 700, minWidth: 36 }}>{m.status}</span>
                        <span style={{ color: C.dim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.text}</span>
                      </div>
                    ))}
                  </>
                )}
              </>
            )}

            {/* ── 매칭용 플로팅 바 ── */}
            {sel.length > 0 && (
              <div style={{
                position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 50,
                background: C.text, borderTop: `1px solid ${C.border}`,
                padding: "12px 16px", display: "flex", gap: 10, alignItems: "center", justifyContent: "center", flexWrap: "wrap",
              }}>
                <span style={{ fontSize: 13, color: "#fff" }}>선택 {sel.length}/2 — {selNames.join(" ↔ ") || ""}</span>
                <button style={{ ...btn(), background: "#374151", color: "#fff", border: "none" }} disabled={sel.length !== 2} onClick={() => matchAction("preview")}>궁합 확인</button>
                <button style={btn("primary")} disabled={sel.length !== 2} onClick={() => matchAction("create")}>인연 카드 발송</button>
                <button style={{ ...btn(), background: "#374151", color: "#fff", border: "none" }} onClick={() => setSel([])}>✕</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
