import type { Metadata, Viewport } from "next"; 
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const fontSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const fontMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// ★ 核心修復 1：使用 Next.js 官方 Viewport API 強制允許背景穿透到相機/狀態列區域
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover", 
  themeColor: "#f1f5f9",
};

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
    statusBarStyle: "black-translucent", // 維持原樣，保護一般 iPhone 體驗
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
        {/* ★ 核心修復 2：智能環境探測腳本 (嚴格隔離 iPhone Duo) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (navigator.userAgent.indexOf('Windows') !== -1) {
                document.documentElement.classList.add('is-windows');
              }
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
      <body className={`${fontSans.variable} ${fontMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
