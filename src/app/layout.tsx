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

// ★ 核心修復：viewport-fit=cover 允許背景穿透至狀態列，並鎖定縮放防止橫直向切換錯亂
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover", 
  themeColor: "#f8fafc", 
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
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (navigator.userAgent.indexOf('Windows') !== -1) {
                  document.documentElement.classList.add('is-windows');
                }
                function syncDeviceLayout() {
                  var isIphone = /iPhone/i.test(navigator.userAgent);
                  var isUnfolded = window.screen.width > 500 && window.screen.height > 500;
                  var isDualScreen = window.matchMedia && window.matchMedia('(horizontal-viewport-segments: 2)').matches;
                  if ((isIphone && isUnfolded) || isDualScreen) {
                    document.documentElement.classList.add('is-iphone-duo');
                  } else {
                    document.documentElement.classList.remove('is-iphone-duo');
                  }
                  // ★ 優先採用 visualViewport.height，精準對應 iOS 旋轉後的實際可視高度
                  var h = (window.visualViewport && window.visualViewport.height) || window.innerHeight;
                  document.documentElement.style.setProperty('--app-height', h + 'px');
                }
                syncDeviceLayout();
                window.addEventListener('resize', syncDeviceLayout);
                if (window.visualViewport) {
                  window.visualViewport.addEventListener('resize', syncDeviceLayout);
                }
                window.addEventListener('orientationchange', function() {
                  // iOS 旋轉動畫約需 300~450ms，分段重算徹底消滅底部空白
                  setTimeout(syncDeviceLayout, 100);
                  setTimeout(syncDeviceLayout, 300);
                  setTimeout(syncDeviceLayout, 500);
                });
              })();
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
