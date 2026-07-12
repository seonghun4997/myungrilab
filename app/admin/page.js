"use client";
// ============================================================
// /admin — 디비 관리 (ADMIN_KEY로 접근)
// 리드 목록 → [리포트 생성] → 링크 복사 → 카카오톡으로 전달
// ============================================================
import { useState } from "react";
import { CONFIG } from "../../lib/content";

export default function Admin() {
  const [key, setKey] = useState("");
  const [leads, setLeads] = useState(null);
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
    const res = await fetch("/api/admin/match", {
      method: "POST",
      headers: { "content-type": "application/json", "x-admin-key": key },
      body: JSON.stringify({ action, aId: sel[0], bId: sel[1] }),
    });
    const d = await res.json();
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
      setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, token: data.token } : l)));
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
  };

  const copy = (text, label) => {
    navigator.clipboard.writeText(text);
    setMsg(label + " 복사됨");
  };

  const reportUrl = (token) => `${window.location.origin}/r/${token}`;
  const kakaoMsg = (l) =>
    `[${CONFIG.BRAND}] ${l.name}님, 월하노인의 인연 감정서가 완성되었습니다.\n\n아래 링크에서 확인하세요 (본인 전용 링크입니다):\n${reportUrl(l.token)}\n\n읽으시다 궁금한 점은 이 채팅으로 언제든 물어보세요.`;

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

      {leads && leads.length === 0 && <p style={{ color: "var(--tx-dim)" }}>아직 들어온 디비가 없습니다.</p>}

      {leads && leads.map((l) => {
        const b = l.birth || {};
        return (
          <div className="card" key={l.id} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
              <div>
                {l.match_optin && (
                  <input type="checkbox" checked={sel.includes(l.id)} onChange={() => toggleSel(l.id)} style={{ marginRight: 8 }} />
                )}
                <b style={{ fontSize: 17, color: "var(--amethyst-hi)" }}>{l.name}</b>{l.match_optin && <span className="mono" style={{ fontSize: 10, marginLeft: 8, color: "var(--thread)", border: "1px solid var(--thread)", borderRadius: 6, padding: "1px 6px" }}>紅線신청</span>}
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
            {b.concern && <p style={{ fontSize: 13, color: "var(--tx)", background: "rgba(139,108,255,0.08)", border: "1px solid rgba(196,176,255,0.3)", borderRadius: 10, padding: "8px 12px", margin: "6px 0 10px" }}>고민: {b.concern}</p>}
            {l.intro && <p style={{ fontSize: 13, color: "var(--tx)", background: "rgba(255,77,94,0.08)", border: "1px solid rgba(255,120,134,0.3)", borderRadius: 10, padding: "8px 12px", margin: "6px 0 10px" }}>紅線 자기소개: {l.intro}</p>}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13, color: l.paid ? "var(--amethyst-hi)" : "var(--tx-dim)" }}>
                <input type="checkbox" checked={!!l.paid} onChange={(e) => togglePaid(l.id, e.target.checked)} />
                결제 확인
              </label>
              {!l.token ? (
                <button className="btn btn-seal" style={{ width: "auto", padding: "9px 16px", fontSize: 14 }} disabled={busy[l.id]} onClick={() => genReport(l.id)}>
                  {busy[l.id] ? "생성 중… (30초)" : "리포트 생성"}
                </button>
              ) : (
                <>
                  <button className="btn btn-ghost" style={{ width: "auto", padding: "9px 14px", fontSize: 13 }} onClick={() => copy(reportUrl(l.token), "링크")}>링크 복사</button>
                  <button className="btn btn-ghost" style={{ width: "auto", padding: "9px 14px", fontSize: 13 }} onClick={() => copy(kakaoMsg(l), "카톡 안내문")}>카톡 안내문 복사</button>
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
            위 목록에서 紅線신청자 2명을 체크 → 궁합 확인 → 카드 발송. 발송 후 양쪽에 인연함 링크(/m/토큰)를 카톡으로 전달하세요.
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
                    {new Date(m.created_at).toLocaleString("ko-KR")} · {m.a_accept === true && m.b_accept === true ? "성사 ✓" : m.a_accept === false || m.b_accept === false ? "거절" : "응답 대기"}
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
