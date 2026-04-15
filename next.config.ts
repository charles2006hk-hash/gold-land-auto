import type { NextConfig } from "next";
// @ts-expect-error - next-pwa 並沒有官方 TypeScript 定義檔，忽略此報錯
import withPWAInit from "next-pwa";

// ★ 設定 PWA 與 Firebase 圖片緩存魔法
const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  runtimeCaching: [
    {
      // 攔截並快取所有 Firebase Storage 圖片
      urlPattern: /^https:\/\/firebasestorage\.googleapis\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'firebase-images',
        expiration: {
          maxEntries: 500,
          maxAgeSeconds: 60 * 60 * 24 * 30, // 圖片保留 30 日
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
    {
      // 快取系統靜態檔案 (確保介面秒開)
      urlPattern: /\.(?:js|css|woff2|png|jpg|jpeg|svg)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-resources',
      },
    },
  ],
});

// 您原本的 NextConfig 設定
const nextConfig: NextConfig = {
  /* config options here */
  // 確保沒有啟用 experimental: { reactCompiler: true }
  // 這樣 Next.js 就會使用預設的穩定編譯器
};

// 將 PWA 魔法包裝落原本的設定度並匯出
export default withPWA(nextConfig);
