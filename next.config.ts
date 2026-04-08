import type { NextConfig } from "next";

const nextConfig: NextConfig = {
<<<<<<<< HEAD:next.config.ts
  output: "standalone",
========
  transpilePackages: ['shared'],
  /* config options here */
>>>>>>>> 878480e31d460c41d17acc112f82025587ef660d:frontend/next.config.ts
};

export default nextConfig;

