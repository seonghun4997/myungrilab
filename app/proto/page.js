"use client";
// ============================================================
// /proto — 클릭형 전기능 와이어프레임 (개발 착수 전 승인용)
// 개편안 전체: 홈 2등불 · 紅線 관문 · 내 서고(문자인증) · 이어읽기 · 선물
// 실제 배포 화면이 아니며, 버튼은 화면 이동만 합니다 (robots 색인 차단)
// ============================================================
import { useState } from "react";

const GOLD = "var(--gold, #ffd479)";
const THREAD = "#ff5a7a";
const DIM = "var(--tx-dim, #9a93c4)";
const LINE = "rgba(196,176,255,.35)";

const MASK = {
  WebkitMaskImage: "radial-gradient(ellipse 64% 72% at 50% 36%, black 52%, transparent 97%)",
  maskImage: "radial-gradient(ellipse 64% 72% at 50% 36%, black 52%, transparent 97%)",
};

function Img({ src, w = "100%", mask = true, style = {} }) {
  return <img src={src} alt="" style={{ display: "block", width: w, height: "auto", margin: "0 auto", ...(mask ? MASK : {}), ...style }} />;
}
function Btn({ children, onClick, red, ghost, style = {} }) {
  return (
    <button onClick={onClick} style={{
      display: "block", width: "100%", padding: "13px 14px", marginBottom: 10, cursor: "pointer",
      borderRadius: 12, fontSize: 14.5, fontWeight: 700, fontFamily: "inherit",
      border: `1px solid ${red ? THREAD : ghost ? LINE : "rgba(255,212,121,.65)"}`,
      background: red ? "rgba(255,90,122,.12)" : ghost ? "transparent" : "rgba(255,212,121,.1)",
      color: red ? THREAD : ghost ? "var(--tx)" : GOLD, ...style,
    }}>{children}</button>
  );
}
function Card({ children, accent, onClick, style = {} }) {
  return (
    <div onClick={onClick} style={{
      border: `1px solid ${accent || LINE}`, borderRadius: 14, padding: "13px 15px", marginBottom: 10,
      background: "rgba(139,108,255,.06)", cursor: onClick ? "pointer" : "default", ...style,
    }}>{children}</div>
  );
}
function H({ children, size = 21 }) {
  return <h2 className="display" style={{ fontSize: size, color: "var(--tx)", textAlign: "center", margin: "6px 0 6px", lineHeight: 1.4 }}>{children}</h2>;
}
function Sub({ children, style = {} }) {
  return <p style={{ fontSize: 12.5, color: DIM, textAlign: "center", marginBottom: 14, lineHeight: 1.65, ...style }}>{children}</p>;
}
function Note({ children }) {
  return <p className="mono" style={{ fontSize: 10, color: DIM, textAlign: "center", margin: "12px 0 0", opacity: .8 }}>{children}</p>;
}

export default function Proto() {
  const [stack, setStack] = useState(["map"]);
  const cur = stack[stack.length - 1];
  const go = (id) => setStack((s) => [...s, id]);
  const back = () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
  const home = () => setStack(["map"]);

  const SCREENS = {
    /* ── S0 지도 ── */
    map: (
      <>
        <H size={23}>🏮 홍서당 프로토타입</H>
        <Sub>개편 완성형 전 기능을 탭하며 둘러보는 설계도예요.<br />아무 화면이나 눌러 시작 — 하단 바로 언제든 복귀.</Sub>
        {[
          ["home", "① 메인 홈 — 등불 2개 체제"],
          ["reading", "② 감정 퍼널 (랜딩→문답→진단→결제)"],
          ["hongseon", "③ 紅線 관문 (신규)"],
          ["mylogin", "④ 내 서고 — 문자 인증 (신규)"],
          ["my", "⑤ 내 서고 홈 (신규)"],
          ["report", "⑥ 감정서 뷰어 + 이어읽기"],
          ["mbox", "⑦ 인연함 (카드→성사)"],
          ["gift", "⑧ 선물하기 (오픈 후)"],
          ["notfound", "⑨ 404"],
        ].map(([id, t]) => (
          <Card key={id} onClick={() => go(id)}><b style={{ fontSize: 14 }}>{t}</b></Card>
        ))}
      </>
    ),

    /* ── S1 홈 ── */
    home: (
      <>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: -6 }}>
          <button onClick={() => go("mylogin")} className="mono" style={{ fontSize: 11, color: GOLD, background: "transparent", border: `1px solid rgba(255,212,121,.5)`, borderRadius: 14, padding: "4px 10px", cursor: "pointer" }}>🌙 내 서고</button>
        </div>
        <div style={{ margin: "0 -14px" }}><Img src="/char/hero.webp" /></div>
        <div style={{ marginTop: -58, position: "relative" }}>
          <div className="eyebrow" style={{ textAlign: "center" }}>紅緖堂 · 정밀 사주 감정 전문관</div>
          <H>무엇이 궁금해서 오셨어요?</H>
          <Sub>등불 하나를 고르면, 제가 명반을 펴볼게요.</Sub>
        </div>
        <Card accent={LINE} onClick={() => go("reading")} style={{ background: "rgba(139,108,255,.14)" }}>
          <b style={{ color: "#d4c6ff", fontSize: 15 }}>🔮 전통 사주 감정 <span className="mono" style={{ fontSize: 9, color: GOLD, border: `1px solid rgba(255,212,121,.5)`, borderRadius: 6, padding: "1px 5px", marginLeft: 6 }}>대표</span></b>
          <div style={{ fontSize: 11.5, color: DIM, marginTop: 3 }}>12개 영역 · 10년 대운 — 인생 전체를 한 권으로</div>
        </Card>
        <Card accent={THREAD} onClick={() => go("hongseon")}>
          <b style={{ color: THREAD, fontSize: 15 }}>🧧 紅線 소개팅</b>
          <div style={{ fontSize: 11.5, color: DIM, marginTop: 3 }}>명반이 맞는 짝을 붉은 실로 이어드려요</div>
        </Card>
        <Card style={{ opacity: .5, borderStyle: "dashed" }}>
          <b style={{ fontSize: 13 }}>💰 재물 · ❤️ 연애 · 💼 직업</b>
          <div style={{ fontSize: 11, color: DIM, marginTop: 3 }}>준비 중 — 지금은 감정서 제7·3·8장에서 만나요</div>
        </Card>
        <Note>무료 진단 · 회원가입 없음 · 3분 · v-proto</Note>
      </>
    ),

    /* ── S2 퍼널 랜딩 ── */
    reading: (
      <>
        <div className="eyebrow" style={{ textAlign: "center" }}>/reading · 롱폼 랜딩 (기존 유지)</div>
        <H>내 인생의 대운은<br /><span style={{ color: GOLD }}>202<span style={{ filter: "blur(5px)" }}>4</span></span>년에 시작됩니다.</H>
        <Sub>8,700만 경우의 수 · 사주 대비 170배 정밀 — 스크롤 설득 구간(황실→비교→검증)은 기존 그대로</Sub>
        <Btn onClick={() => go("ask1")}>자미두수 시작하기 — 무료 진단 ›</Btn>
        <Btn ghost onClick={() => go("home")}>‹ 홈으로</Btn>
      </>
    ),

    /* ── S3 문답(연애상태) ── */
    ask1: (
      <>
        <div style={{ margin: "0 -14px" }}><Img src="/char/hero.webp" style={{ marginBottom: -50 }} /></div>
        <Sub style={{ position: "relative", background: "rgba(15,12,44,.85)", border: `1px solid ${LINE}`, borderRadius: 14, padding: "10px 12px", color: "var(--tx)", fontSize: 13.5 }}>
          홍서당에 오셨네요.<br />당신의 명반, 제가 펴볼게요.
        </Sub>
        <p className="mono" style={{ fontSize: 11, color: DIM, marginBottom: 6 }}>問 五 — 지금 마음은 어느 자리인가요?</p>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
          {["솔로", "썸", "연애 중", "이별 후", "재회 고민"].map((s, i) => (
            <span key={s} className="mono" style={{ fontSize: 12, padding: "6px 12px", borderRadius: 16, border: `1px solid ${i === 1 ? GOLD : LINE}`, color: i === 1 ? GOLD : DIM }}>{s}</span>
          ))}
        </div>
        <Card><span style={{ fontSize: 12.5, color: DIM }}>고민 자유 입력 (선택) — 적어두면 감정서에서 답해드려요</span></Card>
        <Btn onClick={() => go("ask2")}>다 음 ›</Btn>
      </>
    ),

    /* ── S4 문답(전화) ── */
    ask2: (
      <>
        <p className="mono" style={{ fontSize: 11, color: DIM, marginBottom: 6 }}>問 六 — 마지막 질문이에요</p>
        <H size={18}>감정서 받을 연락처를 남겨주세요</H>
        <Card><span className="mono" style={{ fontSize: 15, color: "var(--tx)" }}>010-2822-4997</span></Card>
        <Sub>🔒 입력하신 번호로 감정서 링크가 발송돼요.<br />동의는 버튼 고지 · 혜택 옵트인은 접수 화면에서</Sub>
        <Btn onClick={() => go("diag")}>명반 분석 시작하기 ›</Btn>
      </>
    ),

    /* ── S5 진단 ── */
    diag: (
      <>
        <div style={{ margin: "0 -14px" }}><Img src="/char/omg.webp" style={{ marginBottom: -44 }} /></div>
        <Sub style={{ position: "relative", fontSize: 14, color: "var(--tx)" }}>어머… 별이 크게 움직이는 명이에요.</Sub>
        <Card accent={GOLD}><b style={{ color: GOLD }}>命 · 무료 공개</b><div style={{ fontSize: 12.5, marginTop: 4 }}>명궁의 별 — <b>탐랑</b>: 매력이 넘쳐 사람이 모이는 명…</div></Card>
        {["財 재물 — 감정서 제8장에서", "愛 인연 — 감정서 제3장에서", "運 대운 — 감정서 제7장에서"].map((t) => (
          <Card key={t} style={{ opacity: .55, borderStyle: "dashed" }}><span style={{ fontSize: 12.5 }}>🔒 {t} 열려요</span></Card>
        ))}
        <Btn onClick={() => go("pay")}>정식 감정서 받기 ›</Btn>
        <Note>⏱ 할인 종료까지 49:12:33 — 오퍼바</Note>
      </>
    ),

    /* ── S6 결제 ── */
    pay: (
      <>
        <H size={18}>감정서 선택</H>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          {[["총운", "7장"], ["정밀", "12장 · 인기"], ["전권", "15장"]].map(([a, b], i) => (
            <Card key={a} accent={i === 1 ? GOLD : LINE} style={{ flex: 1, textAlign: "center", marginBottom: 0 }}>
              <b style={{ fontSize: 13 }}>{a}</b><div style={{ fontSize: 10, color: i === 1 ? GOLD : DIM }}>{b}</div>
            </Card>
          ))}
        </div>
        <Btn onClick={() => go("done")}>토스로 3초 결제 (모바일)</Btn>
        <Card><b style={{ fontSize: 12.5 }}>무통장 3스텝</b><div style={{ fontSize: 11.5, color: DIM, marginTop: 3 }}>① 신한 110-471-674409 [복사] → ② 확인(9시~24시, 보통 1시간) → ③ 완료</div></Card>
        <Btn red onClick={() => go("done")}>입금을 완료했어요</Btn>
      </>
    ),

    /* ── S7 접수 ── */
    done: (
      <>
        <div style={{ margin: "0 -14px" }}><Img src="/char/wait.webp" style={{ marginBottom: -40 }} /></div>
        <H size={18}>접수됐어요. 차 한잔하며 기다려요.</H>
        <Sub>확인되는 대로 감정서 링크를 문자로 보내드릴게요.</Sub>
        <Card accent={GOLD} style={{ textAlign: "center" }}><span className="mono" style={{ fontSize: 10, color: DIM }}>주문코드 — 캡처해두세요</span><div className="mono" style={{ fontSize: 17, color: GOLD, fontWeight: 700 }}>A3F9K2</div></Card>
        <Btn ghost onClick={() => go("report")}>💬 (문자 도착!) 감정서 열기 ›</Btn>
      </>
    ),

    /* ── S8 紅線 관문 ── */
    hongseon: (
      <>
        <div style={{ margin: "0 -14px" }}><Img src="/char/thread.webp" style={{ marginBottom: -48 }} /></div>
        <H>명반이 맞는 짝을,<br />붉은 실로 이어드려요</H>
        <Card><b style={{ fontSize: 12.5 }}>어떻게 되나요</b>
          <div style={{ fontSize: 12, color: DIM, marginTop: 4, lineHeight: 1.7 }}>① 감정서로 내 명반을 확인하고<br />② 매일 밤, 궁합이 가장 맞는 한 분의 카드를 받고<br />③ 서로 [잇기]를 누르면 — 연락처가 교환돼요</div>
        </Card>
        <Sub>실명·사진 비공개 · 감정서 구매자만 · 베타 성사비 0원</Sub>
        <Btn red onClick={() => go("reading")}>감정서 받고 시작하기 ›</Btn>
        <Btn ghost onClick={() => go("mbox")}>이미 감정서가 있어요 — 내 인연함 ›</Btn>
      </>
    ),

    /* ── S9 서고 인증 ── */
    mylogin: (
      <>
        <H>🌙 내 서고</H>
        <Sub>가입도 비밀번호도 없어요.<br />감정 받을 때 쓴 전화번호면 충분해요.</Sub>
        <Card><span className="mono" style={{ fontSize: 14 }}>010-2822-4997</span></Card>
        <Btn onClick={() => go("mycode")}>인증 문자 받기</Btn>
        <Btn ghost onClick={() => go("home")}>‹ 홈으로</Btn>
      </>
    ),
    mycode: (
      <>
        <H size={18}>문자로 온 6자리를 넣어주세요</H>
        <Card style={{ textAlign: "center" }}><span className="mono" style={{ fontSize: 22, letterSpacing: 8, color: GOLD }}>4 9 9 7 ▢ ▢</span></Card>
        <Sub>5분 안에 입력 · 이 기기는 90일 자동 입장</Sub>
        <Btn onClick={() => go("my")}>서고 열기 ›</Btn>
      </>
    ),

    /* ── S10 서고 홈 ── */
    my: (
      <>
        <Card accent={GOLD} style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ fontSize: 26 }}>🌙</span>
          <span><b style={{ fontSize: 15 }}>성훈 님의 서고</b><br />
            <span className="mono" style={{ fontSize: 11, color: DIM }}>2002.04.26 · 巳時 · </span><span className="mono" style={{ fontSize: 11, color: GOLD }}>#탐랑 명궁</span></span>
        </Card>
        <Card accent={GOLD} onClick={() => go("report")}>
          <b style={{ fontSize: 13.5 }}>📜 내 감정서 — 인생 책임 패키지 (15장)</b>
          <div style={{ fontSize: 12, color: GOLD, marginTop: 4 }}>제7장까지 읽으셨어요 — 이어 읽기 ›</div>
        </Card>
        <Card accent={THREAD} onClick={() => go("mbox")}>
          <b style={{ fontSize: 13.5, color: THREAD }}>🧧 내 인연함</b>
          <div style={{ fontSize: 12, color: DIM, marginTop: 4 }}>오늘의 카드 1장 도착 — 밤 11시 마감 ›</div>
        </Card>
        <Card onClick={() => go("gift")}>
          <b style={{ fontSize: 13 }}>🎁 소중한 사람 감정 선물하기</b>
          <div style={{ fontSize: 11.5, color: DIM, marginTop: 3 }}>어머니의 명반, 그 사람의 명반 ›</div>
        </Card>
        <Card><b style={{ fontSize: 12.5 }}>계정</b><div style={{ fontSize: 11.5, color: DIM, marginTop: 3 }}>📱 010-2822-4997 · 생년 정보 수정은 문자 회신으로</div></Card>
      </>
    ),

    /* ── S11 감정서 ── */
    report: (
      <>
        <div className="eyebrow" style={{ textAlign: "center" }}>제1부 · 나의 별자리 지도</div>
        <H size={19}>제3장 · 내 인연은 언제,<br />어떤 모습으로 올까</H>
        <Card><p style={{ fontSize: 12.5, lineHeight: 1.8 }}>썸 — 답장 하나를 붙잡고 밤을 새우는 요즘이시죠. 성훈님의 부처궁에는 태음이 앉아 있습니다. 곱고 섬세한 정서의 사람…</p></Card>
        <Sub className="mono" style={{ fontSize: 11 }}>‹ 7 / 16 › · 읽던 위치 자동 저장 → 서고·재방문 칩에서 "7장부터 이어 읽기"</Sub>
        <div style={{ margin: "0 -14px" }}><Img src="/char/thread.webp" w="72%" style={{ marginBottom: -36 }} /></div>
        <Card accent={THREAD} style={{ textAlign: "center" }}>
          <b style={{ color: THREAD, fontSize: 13.5 }}>맺음 — 이 인연, 실제로 찾아드릴까요?</b>
          <div style={{ fontSize: 11.5, color: DIM, marginTop: 3 }}>홍서 아씨가 명반 궁합이 맞는 인연에게 붉은 실을 걸어드려요</div>
        </Card>
        <Btn red onClick={() => go("optin")}>紅線 신청하기 (베타 0원) ›</Btn>
      </>
    ),

    /* ── S12 紅線 온보딩 ── */
    optin: (
      <>
        <H size={18}>紅線 프로필 — 홍서 아씨에게<br />나를 알려주세요</H>
        <Card><b style={{ fontSize: 12.5 }}>① 아바타 · 관심사</b> <span style={{ fontSize: 12, color: DIM }}>🦊 영화 · 운동 · 맛집</span></Card>
        <Card><b style={{ fontSize: 12.5 }}>② 한 줄 소개</b> <span style={{ fontSize: 12, color: DIM }}>"주말엔 러닝, 밤엔 영화 보는 사람"</span></Card>
        <Card><b style={{ fontSize: 12.5 }}>③ 카카오톡 아이디</b> <span className="mono" style={{ fontSize: 12, color: DIM }}>성사 전엔 비공개</span></Card>
        <Btn red onClick={() => go("mbox")}>신청 완료 — 인연함 열기 ›</Btn>
      </>
    ),

    /* ── S13 인연함 ── */
    mbox: (
      <>
        <div style={{ margin: "0 -14px" }}><Img src="/char/loading.webp" w="56%" style={{ marginBottom: -30 }} /></div>
        <H size={18}>오늘의 인연 카드</H>
        <Card accent={THREAD}>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ fontSize: 30 }}>🐰</span>
            <span><b style={{ fontSize: 14 }}>궁합 94점 <span className="mono" style={{ fontSize: 10, color: THREAD }}>상위 3%</span></b><br />
              <span style={{ fontSize: 11.5, color: DIM }}>홍서 아씨가 본 이 사람: 태음 부처궁 — 다정한 말이 양식인…</span></span>
          </div>
        </Card>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn red style={{ flex: 1 }} onClick={() => go("matched")}>잇기</Btn>
          <Btn ghost style={{ flex: 1 }} onClick={() => go("mbox")}>넘기기</Btn>
        </div>
        <Note>⏱ 오늘 밤 11시 마감 · 응답은 문자로도 알려드려요</Note>
      </>
    ),
    matched: (
      <>
        <div style={{ margin: "0 -14px" }}><Img src="/char/match.webp" style={{ marginBottom: -44 }} /></div>
        <H>연이 성사되었어요!</H>
        <Sub>붉은 실이 이어졌어요 — 서로의 연락처가 열립니다.</Sub>
        <Card accent={GOLD} style={{ textAlign: "center" }}><span className="mono" style={{ fontSize: 14, color: GOLD }}>상대 카톡: moon_rabbit ✨</span></Card>
        <Btn onClick={() => {}}>카톡 아이디 복사</Btn>
        <Btn ghost onClick={() => go("my")}>내 서고로 ›</Btn>
      </>
    ),

    /* ── S14 선물 ── */
    gift: (
      <>
        <H size={19}>🎁 감정 선물하기</H>
        <Sub>받는 분의 생년월일만 알면 돼요.<br />감정서 링크가 그분 문자로 전해집니다.</Sub>
        <Card><b style={{ fontSize: 12.5 }}>받는 분</b> <span style={{ fontSize: 12, color: DIM }}>이름 · 생년월일 · 시 · 전화번호</span></Card>
        <Card><b style={{ fontSize: 12.5 }}>보내는 말</b> <span style={{ fontSize: 12, color: DIM }}>"엄마, 올해 운은 내가 봐줄게" (문자에 함께)</span></Card>
        <Btn onClick={() => go("pay")}>상품 고르고 선물하기 ›</Btn>
        <Note>오픈 후 기능 — 프로토에서 흐름만 확인</Note>
      </>
    ),

    /* ── S15 404 ── */
    notfound: (
      <>
        <div style={{ margin: "0 -14px" }}><Img src="/char/lost.webp" style={{ marginBottom: -44 }} /></div>
        <H>길을 잃으셨네요</H>
        <Sub>감정서·인연함은 문자로 받은 전용 링크로,<br />아니면 내 서고에서 찾을 수 있어요.</Sub>
        <Btn onClick={() => go("home")}>홍서당 처음으로 →</Btn>
        <Btn ghost onClick={() => go("mylogin")}>🌙 내 서고에서 찾기</Btn>
      </>
    ),
  };

  const TITLE = {
    map: "화면 지도", home: "S1 · 메인 홈", reading: "S2 · 퍼널 랜딩", ask1: "S3 · 문답(연애상태)",
    ask2: "S4 · 문답(연락처)", diag: "S5 · 무료 진단", pay: "S6 · 결제", done: "S7 · 접수",
    hongseon: "S8 · 紅線 관문 (신규)", mylogin: "S9 · 서고 인증 (신규)", mycode: "S9-2 · 코드 입력",
    my: "S10 · 내 서고 (신규)", report: "S11 · 감정서+이어읽기", optin: "S12 · 紅線 온보딩",
    mbox: "S13 · 인연함", matched: "S13-2 · 성사", gift: "S14 · 선물 (오픈 후)", notfound: "S15 · 404",
  };

  return (
    <main className="wrap" style={{ paddingTop: 18, paddingBottom: 96, maxWidth: 430 }}>
      <div className="mono" style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: DIM, marginBottom: 12, letterSpacing: ".08em" }}>
        <span style={{ color: THREAD }}>◉ PROTOTYPE</span><span>{TITLE[cur]}</span>
      </div>
      <div key={cur} style={{ padding: "0 2px" }}>{SCREENS[cur]}</div>

      {/* 하단 내비 */}
      <div style={{
        position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 50,
        background: "rgba(10,8,30,.96)", borderTop: `1px solid ${LINE}`,
        display: "flex", gap: 8, padding: "10px 14px", justifyContent: "center",
      }}>
        <button onClick={back} className="mono" style={{ flex: 1, maxWidth: 130, padding: "10px", fontSize: 12, borderRadius: 10, border: `1px solid ${LINE}`, background: "transparent", color: "var(--tx)", cursor: "pointer" }}>‹ 이전</button>
        <button onClick={home} className="mono" style={{ flex: 1, maxWidth: 130, padding: "10px", fontSize: 12, borderRadius: 10, border: `1px solid rgba(255,212,121,.5)`, background: "rgba(255,212,121,.08)", color: GOLD, cursor: "pointer" }}>🗺 화면 지도</button>
      </div>
    </main>
  );
}
