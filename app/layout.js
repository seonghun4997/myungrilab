import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import { CONFIG } from "../lib/content";

export const viewport = {
  themeColor: "#07071a",
};

export const metadata = {
  metadataBase: new URL("https://myungrilab.vercel.app"), // 도메인 연결 시 이 주소만 교체
  title: `${CONFIG.BRAND} — ${CONFIG.TAGLINE}`,
  description: `${CONFIG.CLAIM}. 재물·직업·연애·건강 — 인생 12개 영역과 10년 대운의 흐름을 자미두수 명반으로 감정합니다.`,
  openGraph: {
    title: `${CONFIG.BRAND}(${CONFIG.BRAND_HANJA}) — ${CONFIG.TAGLINE}`,
    description: "내 인생의 대운은 언제 시작될까. 돈·일·사랑·건강, 12개 영역을 월하노인이 명반으로 짚어드립니다.",
    type: "website",
    locale: "ko_KR",
    siteName: CONFIG.BRAND,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Song+Myung&family=Gowun+Batang:wght@400;700&family=IBM+Plex+Mono:wght@400;600&display=swap"
          rel="stylesheet"
        />
        {process.env.NEXT_PUBLIC_META_PIXEL_ID && (
          <script
            dangerouslySetInnerHTML={{
              __html: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${process.env.NEXT_PUBLIC_META_PIXEL_ID}');fbq('track','PageView');`,
            }}
          />
        )}
      </head>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
