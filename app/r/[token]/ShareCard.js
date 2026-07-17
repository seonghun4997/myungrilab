"use client";
// ============================================================
// 내 명반 카드 — 인스타 스토리용 PNG 저장 (1080×1350, 캔버스 렌더)
// ============================================================
import { ev } from "../../../lib/track";

export default function ShareCard({ name, myeongStars, bureau, rarityPct }) {
  const save = () => {
    ev("share_card_save");
    const W = 1080, H = 1350;
    const cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    const x = cv.getContext("2d");

    // 밤하늘
    const g = x.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#07071a"); g.addColorStop(0.55, "#141138"); g.addColorStop(1, "#241c5e");
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    // 별
    let seed = 9;
    const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    for (let i = 0; i < 90; i++) {
      x.globalAlpha = 0.25 + rnd() * 0.6;
      x.fillStyle = "#fff";
      x.beginPath(); x.arc(rnd() * W, rnd() * H * 0.7, 1 + rnd() * 2.2, 0, 7); x.fill();
    }
    x.globalAlpha = 1;
    // 달
    const mg = x.createRadialGradient(W / 2, 330, 40, W / 2, 330, 260);
    mg.addColorStop(0, "rgba(244,233,200,.9)"); mg.addColorStop(0.35, "rgba(244,233,200,.15)"); mg.addColorStop(1, "rgba(244,233,200,0)");
    x.fillStyle = mg; x.fillRect(0, 0, W, 700);
    x.fillStyle = "#f4e9c8"; x.beginPath(); x.arc(W / 2, 330, 110, 0, 7); x.fill();
    // 산
    x.fillStyle = "#1a1547";
    x.beginPath(); x.moveTo(0, 760); x.lineTo(200, 600); x.lineTo(420, 750); x.lineTo(640, 580); x.lineTo(860, 740); x.lineTo(W, 640); x.lineTo(W, H); x.lineTo(0, H); x.fill();
    x.fillStyle = "#100e33";
    x.beginPath(); x.moveTo(0, 880); x.lineTo(260, 720); x.lineTo(540, 870); x.lineTo(820, 700); x.lineTo(W, 860); x.lineTo(W, H); x.lineTo(0, H); x.fill();
    // 붉은 실
    x.strokeStyle = "#ff5c6e"; x.lineWidth = 7; x.lineCap = "round";
    x.beginPath(); x.moveTo(140, 1010); x.bezierCurveTo(400, 880, 680, 1120, 940, 950); x.stroke();
    x.fillStyle = "#ff5c6e";
    x.beginPath(); x.arc(140, 1010, 11, 0, 7); x.fill();
    x.beginPath(); x.arc(940, 950, 11, 0, 7); x.fill();

    // 텍스트
    x.textAlign = "center";
    x.fillStyle = "#c4b0ff"; x.font = "500 30px serif";
    x.fillText("紫 微 緣 · 자미두수 명반", W / 2, 560);
    x.fillStyle = "#ffffff"; x.font = "72px serif";
    x.fillText(`${name}의 명궁`, W / 2, 660);
    x.fillStyle = "#ffd479"; x.font = "94px serif";
    x.fillText(myeongStars || "공궁", W / 2, 790);
    x.fillStyle = "#eae6ff"; x.font = "40px serif";
    x.fillText(`${bureau || ""} · 상위 ${rarityPct}% 배치`, W / 2, 870);
    x.fillStyle = "rgba(234,230,255,.75)"; x.font = "34px serif";
    x.fillText("달 아래에서, 홍서 아씨가 읽다", W / 2, 1180);
    x.fillStyle = "rgba(234,230,255,.5)"; x.font = "28px sans-serif";
    x.fillText("myungrilab.vercel.app", W / 2, 1250);

    const a = document.createElement("a");
    a.download = `홍서당-명반카드-${name}.png`;
    a.href = cv.toDataURL("image/png");
    a.click();
  };

  return (
    <button onClick={save} className="btn btn-ghost" style={{ marginTop: 14, fontSize: 13.5 }}>
      내 명반 카드 저장하기 — 인스타에 자랑해도 좋아요
    </button>
  );
}
