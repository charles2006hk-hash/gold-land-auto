import type { Metadata } from "next"; 
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// ★ 1. 重新命名變數，強制繞過 Next.js 的字體快取衝突 Bug
const fontSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const fontMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// ★ 2. Metadata 設定
export const metadata: Metadata = {
  title: "Gold Land Auto DMS", 
  description: "Vehicle Management System for Gold Land Auto",
  manifest: "/manifest.json", 
  icons: {
    icon: '/GL_APPLOGO.png',
    apple: '/GL_APPLOGO.png',
  },
  appleWebApp: {
    capable: true, 
    title: "金田 DMS",
    statusBarStyle: "black-translucent",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-HK">
      <head>
        {/* ★ 3. 終極全面屏解鎖 */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#f1f5f9" />

        {/* ★ 4. 系統環境探測腳本 (Windows 降維 + iPhone Duo 適配) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // [1] Windows 破圖降維探測
              if (navigator.userAgent.indexOf('Windows') !== -1) {
                document.documentElement.classList.add('is-windows');
              }

              // [2] iPhone Duo / 摺疊屏展開模式探測
              // 條件：是 iPhone 且螢幕寬高異常大(展開)，或是支援雙螢幕標準 API
              var isIphone = /iPhone/i.test(navigator.userAgent);
              var isUnfolded = window.screen.width > 500 && window.screen.height > 500;
              var isDualScreen = window.matchMedia && window.matchMedia('(horizontal-viewport-segments: 2)').matches;
              
              if ((isIphone && isUnfolded) || isDualScreen) {
                document.documentElement.classList.add('is-iphone-duo');
              }
            `,
          }}
        />
      </head>
      <body
        className={`${fontSans.variable} ${fontMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
