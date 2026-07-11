import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import { CONFIG } from "../lib/content";

export const metadata = {
  title: `${CONFIG.BRAND} — ${CONFIG.TAGLINE}`,
  description: `${CONFIG.CLAIM}. 자미두수 부처궁(夫妻宮)으로 정해진 짝의 모습과 인연의 해를 감정합니다.`,
  openGraph: {
    title: `${CONFIG.BRAND}(${CONFIG.BRAND_HANJA}) — ${CONFIG.TAGLINE}`,
    description: "내 운명의 짝은 언제, 어떤 모습으로 나타날까. 월하노인이 명반을 펴 드립니다.",
    type: "website",
    locale: "ko_KR",
    siteName: CONFIG.BRAND,
  },
  themeColor: "#07071a",
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
