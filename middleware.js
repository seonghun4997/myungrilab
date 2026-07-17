import { NextResponse } from "next/server";

export function middleware(request) {
  const hasAdminCookie = request.cookies.has("hs_admin");
  const { pathname } = request.nextUrl;

  // /proto — 어드민 쿠키 없으면 로그인 화면으로
  if (!hasAdminCookie && pathname.startsWith("/proto")) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    return NextResponse.redirect(url);
  }

  // /admin — 쿠키 없으면 HTML은 주되 X-Admin-Unauthed 헤더를 붙여 응답
  // (어드민 페이지 자체가 로그인 화면이므로 HTML은 허용, API는 이미 server-side 보호됨)
  if (!hasAdminCookie && (pathname === "/admin" || pathname.startsWith("/admin/"))) {
    const res = NextResponse.next();
    res.headers.set("X-Admin-Unauthed", "1");
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/proto/:path*"],
};
