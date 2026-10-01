// ============================================================
// /m/[token] — 紅線 소개팅 종료(2026-10) 후 남은 옛 인연함 링크
// 이미 문자로 나간 링크를 같은 손님의 감정서(/r/[token])로 넘긴다
// ============================================================
import { redirect } from "next/navigation";

export default function OldMatchBox({ params }) {
  redirect(`/r/${encodeURIComponent(params.token)}`);
}
