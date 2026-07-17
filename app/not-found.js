import Link from "next/link";

// 존재하지 않는 주소 — 세계관을 지키는 안내 화면
export default function NotFound() {
  return (
    <main
      className="wrap"
      style={{
        minHeight: "72vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "60px 20px",
      }}
    >
      <div style={{ fontSize: 46, marginBottom: 14 }} aria-hidden="true">🌙</div>
      <h1 className="display" style={{ fontSize: 24, color: "var(--tx)", marginBottom: 10 }}>
        길을 잃으셨군요
      </h1>
      <p style={{ fontSize: 14.5, color: "var(--tx-dim)", lineHeight: 1.8, marginBottom: 26 }}>
        찾으시는 페이지가 없거나, 주소가 잘못되었어요.
        <br />
        감정서·인연함은 문자로 받으신 본인 전용 링크로 열어주세요.
      </p>
      <Link href="/" className="btn" style={{ width: "auto", padding: "13px 26px", textDecoration: "none" }}>
        홍서당 처음으로 →
      </Link>
    </main>
  );
}
