import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import { CONFIG } from "../lib/content";

export const metadata = {
  title: `${CONFIG.BRAND} — ${CONFIG.TAGLINE}`,
  description: `${CONFIG.CLAIM} — ${CONFIG.TAGLINE}`,
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Song+Myung&family=Gowun+Batang:wght@400;700&family=IBM+Plex+Mono:wght@400;600&family=East+Sea+Dokdo&family=Nanum+Brush+Script&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
