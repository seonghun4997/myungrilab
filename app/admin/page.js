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

  const load = async () => {
    setMsg("");
    const res = await fetch("/api/admin/leads", { headers: { "x-admin-key": key } });
    const data = await res.json();
    if (!res.ok) { setMsg(data.error || "불러오기 실패"); return; }
    setLeads(data.leads);
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
    `[${CONFIG.BRAND}] ${l.name}님, 정식 살풀이 리포트가 완성되었습니다.\n\n아래 링크에서 확인하세요 (본인 전용 링크입니다):\n${reportUrl(l.token)}\n\n읽으시다 궁금한 점은 이 채팅으로 언제든 물어보세요.`;

  return (
    <main className="wrap" style={{ paddingTop: 40, paddingBottom: 80 }}>
      <div className="eyebrow">관리자</div>
      <h1 className="display" style={{ fontSize: 24, margin: "10px 0 20px", color: "var(--ash)" }}>디비 관리</h1>

      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <input
          type="password"
          placeholder="관리자 키"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          style={{ flex: 1, padding: 12, background: "#14110e", border: "1.5px solid #3a332b", color: "var(--ash)", fontSize: 15 }}
        />
        <button className="btn" style={{ width: "auto", padding: "12px 22px" }} onClick={load}>불러오기</button>
      </div>
      {msg && <p className="mono" style={{ fontSize: 13, color: "var(--talisman)", marginBottom: 14 }}>{msg}</p>}

      {leads && leads.length === 0 && <p style={{ color: "var(--ash-dim)" }}>아직 들어온 디비가 없습니다.</p>}

      {leads && leads.map((l) => {
        const b = l.birth || {};
        return (
          <div className="card" key={l.id} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
              <div>
                <b style={{ fontSize: 17, color: "var(--talisman)" }}>{l.name}</b>
                <span className="mono" style={{ fontSize: 13, marginLeft: 10, color: "var(--ash)" }}>{l.phone}</span>
              </div>
              <span className="mono" style={{ fontSize: 11, color: "var(--ash-dim)" }}>
                {new Date(l.created_at).toLocaleString("ko-KR")}
              </span>
            </div>
            <p className="mono" style={{ fontSize: 12.5, color: "var(--ash-dim)", margin: "8px 0" }}>
              {b.y}.{b.m}.{b.d} {b.hour != null ? `${b.hour}시` : "시간모름"} · {b.gender === "M" ? "남" : "여"} · {b.region || "-"} ·
              살 {l.sal_count ?? "-"}개{l.sal_names?.length ? ` (${l.sal_names.join(",")})` : ""} ·
              검증 {l.quiz_hits ?? "-"}/5
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13, color: l.paid ? "var(--talisman)" : "var(--ash-dim)" }}>
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
                  <a className="mono" style={{ fontSize: 12, color: "var(--talisman)" }} href={`/r/${l.token}`} target="_blank" rel="noreferrer">열람 ↗</a>
                </>
              )}
            </div>
          </div>
        );
      })}
    </main>
  );
}
