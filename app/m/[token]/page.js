"use client";
// ============================================================
// /m/[token] — 내 인연함 (紅線 매칭)
// 카드 도착 → 블라인드 프로필 + 월하노인 궁합 감정 → 수락/거절
// → 양측 수락 시 성사 → 성사비 → 카카오톡 아이디 상호 공개
// ============================================================
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { CONFIG, MATCH_CONFIG, MATCH_UI } from "../../../lib/content";
import { ev } from "../../../lib/track";

export default function MatchBox() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [kakao, setKakao] = useState("");

  const load = async () => {
    try {
      const res = await fetch(`/api/match?token=${token}`);
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "불러오기 실패");
      if (!data) ev("matchbox_view", { cards: (d.cards || []).length });
      setData(d);
    } catch (e) { setErr(e.message); }
  };
  useEffect(() => { load(); }, []); // eslint-disable-line

  const respond = async (matchId, accept) => {
    setBusy(true);
    ev(accept ? "match_accept" : "match_decline");
    await fetch("/api/match", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, matchId, action: "respond", accept }),
    });
    await load();
    setBusy(false);
  };

  const saveKakao = async (matchId) => {
    if (!kakao.trim()) return;
    setBusy(true);
    ev("match_kakao_set");
    await fetch("/api/match", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, matchId, action: "kakao", kakaoId: kakao }),
    });
    setKakao("");
    await load();
    setBusy(false);
  };

  return (
    <main className="phone mbox">
      <div className="stars" />
      <header className="mb-head">
        <span className="logo">{CONFIG.BRAND_HANJA}</span>
        <h1>{MATCH_UI.BOX_TITLE}</h1>
        {data?.name && <p className="mb-sub">{data.name} 님의 붉은 실이 이곳에 모입니다</p>}
      </header>

      {err && <p className="mb-err">{err}</p>}
      {!data && !err && <p className="mb-sub" style={{ textAlign: "center" }}>인연함을 여는 중일세...</p>}

      {data && data.cards.length === 0 && (
        <div className="gcard" style={{ textAlign: "center" }}>
          <p className="open-tx">아직 도착한 연이 없네.<br />월하노인이 그대에게 맞는 실을 고르는 중이니,<br />연이 물리면 카카오톡으로 알려줌세.</p>
        </div>
      )}

      {data && data.cards.map((c) => (
        <div className="mcard" key={c.id}>
          <div className="mc-date">{new Date(c.createdAt).toLocaleDateString("ko-KR", { month: "long", day: "numeric" })} 인연 카드</div>

          {/* 상태별 헤더 */}
          {c.matched ? (
            <div className="mc-state matched">🧵 {MATCH_UI.BOTH_YES}</div>
          ) : c.myAccept === false ? (
            <div className="mc-state declined">{MATCH_UI.DECLINED}</div>
          ) : c.myAccept === true ? (
            <div className="mc-state wait">{MATCH_UI.WAIT_OTHER}</div>
          ) : (
            <div className="mc-state new">{MATCH_UI.CARD_ARRIVED}</div>
          )}

          {/* 블라인드 프로필 */}
          <div className={"mprofile" + (c.myAccept === false ? " dim" : "")}>
            <div className="mp-avatar">{c.other.avatar}</div>
            <div className="mp-main">
              <b>{c.other.age ? `${c.other.age}살` : ""}{c.other.job ? ` | ${c.other.job}` : ""}</b>
              <div className="mp-tags">
                {c.other.region && <span>#{c.other.region}</span>}
                {c.other.interests.slice(0, 4).map((t) => <span key={t}>#{t}</span>)}
              </div>
            </div>
          </div>
          {c.other.intro && c.myAccept !== false && (
            <p className="mp-intro">“{c.other.intro}”</p>
          )}

          {/* 월하노인 궁합 감정 */}
          {c.note && c.myAccept !== false && (
            <div className="mp-note">
              <span className="mp-note-t">月下老人의 감정</span>
              <p>{c.note}</p>
            </div>
          )}

          {/* 액션 */}
          {c.myAccept == null && !c.matched && (
            <div className="mc-actions">
              <button className="m-accept" disabled={busy} onClick={() => respond(c.id, true)}>{MATCH_UI.ACCEPT}</button>
              <button className="m-decline" disabled={busy} onClick={() => respond(c.id, false)}>{MATCH_UI.DECLINE}</button>
            </div>
          )}

          {/* 성사 → 결제 + 카톡 교환 */}
          {c.matched && (
            <div className="mc-final">
              {c.otherKakao ? (
                <div className="mc-kakao-open">
                  <span>상대의 카카오톡 아이디</span>
                  <b>{c.otherKakao}</b>
                  <p>좋은 연 되시게. 月下老人은 여기까지일세.</p>
                </div>
              ) : (
                <>
                  <p className="mc-paynote">{MATCH_UI.PAY_NOTE}</p>
                  <div className="mc-paystate">
                    <span className={c.myPaid ? "on" : ""}>나의 성사비 {c.myPaid ? "확인됨 ✓" : "대기"}</span>
                    <span className={c.otherPaid ? "on" : ""}>상대의 성사비 {c.otherPaid ? "확인됨 ✓" : "대기"}</span>
                  </div>
                  {!c.myPaid && (
                    <a className="m-accept" style={{ display: "block", textAlign: "center", textDecoration: "none" }} href={MATCH_CONFIG.PAYMENT_URL} target="_blank" rel="noopener noreferrer" onClick={() => ev("match_fee_click")}>
                      성사비 결제하기 ({MATCH_CONFIG.PRICE.toLocaleString("ko-KR")}원)
                    </a>
                  )}
                  {!c.myKakaoSet ? (
                    <div className="mc-kakao-in">
                      <input placeholder={MATCH_UI.KAKAO_PLACEHOLDER} value={kakao} onChange={(e) => setKakao(e.target.value)} />
                      <button disabled={busy || !kakao.trim()} onClick={() => saveKakao(c.id)}>등록</button>
                    </div>
                  ) : (
                    <p className="mc-paynote" style={{ marginTop: 10 }}>내 카카오톡 아이디 등록 완료 ✓ — 두 사람의 성사비가 모두 확인되면 서로에게 공개되네.</p>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      ))}

      <footer style={{ position: "relative", zIndex: 2 }}>
        <p>문의는 카카오톡 채널로 · © {new Date().getFullYear()} {CONFIG.BRAND}</p>
      </footer>
    </main>
  );
}
