import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    // Preserve Node resolution of the Japanese parser's local dictionary.
    serverExternalPackages: ["kuroshiro", "kuroshiro-analyzer-kuromoji"],
    outputFileTracingIncludes: {
        "/api/translate": [
            "./node_modules/.pnpm/kuromoji@*/node_modules/kuromoji/dict/**/*",
            "./node_modules/kuromoji/dict/**/*",
        ],
    },
    turbopack: {
        root: process.cwd(),
    },
};

export default nextConfig;
