import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: __dirname,
  },
  // 單元 7：/admin/orders 非白名單以 forbidden() 回 HTTP 403。
  experimental: {
    authInterrupts: true,
  },
};

export default nextConfig;
