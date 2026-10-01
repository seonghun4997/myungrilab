"use client";
// ============================================================
// 공용 이벤트 트래커 — Vercel Analytics + Meta Pixel 동시 발사
// (app/page.js 내부의 ev()와 동일 동작 · 리포트 페이지에서 사용)
// ============================================================
import { track } from "@vercel/analytics";

const FBQ_MAP = {
  report_view: "ViewContent",
};

export function ev(name, data) {
  try { track(name, data || {}); } catch (e) {}
  try {
    if (typeof window !== "undefined" && window.fbq) {
      if (FBQ_MAP[name]) window.fbq("track", FBQ_MAP[name]);
      else window.fbq("trackCustom", name, data || {});
    }
  } catch (e) {}
}
