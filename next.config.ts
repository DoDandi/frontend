import type { NextConfig } from "next";

// 화면 코드는 지금처럼 '/api/...'로 부르고, Next가 백엔드 서버로 넘겨준다.
// 같은 주소에서 부르는 것처럼 보여서 CORS 설정이 필요 없다.
const backendUrl = process.env.BACKEND_URL ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${backendUrl}/api/:path*` }];
  },
};

export default nextConfig;
