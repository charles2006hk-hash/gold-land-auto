import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // 確保沒有啟用 experimental: { reactCompiler: true }
  // 這樣 Next.js 就會使用預設的穩定編譯器
};

export default nextConfig;
