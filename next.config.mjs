import withBundleAnalyzer from "@next/bundle-analyzer";

const analyzer = withBundleAnalyzer({
    enabled: process.env.ANALYZE === "true",
});

// React 개발 모드는 스택 재구성 등 디버깅 기능에 eval()을 사용한다.
// 개발 환경에서만 허용하고 프로덕션 CSP는 엄격하게 유지한다.
const isDev = process.env.NODE_ENV === "development";
const scriptSrc = isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : "script-src 'self' 'unsafe-inline'";

/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "cdn.sanity.io",
            },
        ],
    },
    async headers() {
        const securityHeaders = [
            {
                key: "X-Frame-Options",
                value: "SAMEORIGIN",
            },
            {
                key: "X-Content-Type-Options",
                value: "nosniff",
            },
            {
                key: "Referrer-Policy",
                value: "strict-origin-when-cross-origin",
            },
            {
                key: "Permissions-Policy",
                value: "camera=(), microphone=(), geolocation=()",
            },
            {
                key: "X-DNS-Prefetch-Control",
                value: "on",
            },
            {
                key: "Strict-Transport-Security",
                value: "max-age=63072000; includeSubDomains; preload",
            },
        ];

        return [
            // Sanity Studio (/admin) — unsafe-eval 필요
            {
                source: "/admin/:path*",
                headers: [
                    ...securityHeaders,
                    {
                        key: "Content-Security-Policy",
                        value: [
                            "default-src 'self'",
                            "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
                            "style-src 'self' 'unsafe-inline'",
                            "img-src 'self' data: blob: https://cdn.sanity.io",
                            "font-src 'self' data:",
                            "connect-src 'self' https://*.sanity.io https://*.apicdn.sanity.io wss://*.sanity.io",
                            "media-src 'self' https://cdn.sanity.io blob:",
                            "frame-src 'self'",
                            "frame-ancestors 'self'",
                        ].join("; "),
                    },
                ],
            },
            // 일반 페이지 — 엄격한 CSP
            {
                source: "/((?!admin).*)",
                headers: [
                    ...securityHeaders,
                    {
                        key: "Content-Security-Policy",
                        value: [
                            "default-src 'self'",
                            scriptSrc,
                            "style-src 'self' 'unsafe-inline'",
                            "img-src 'self' data: blob: https://cdn.sanity.io",
                            "font-src 'self' data:",
                            "connect-src 'self' https://*.sanity.io https://*.apicdn.sanity.io wss://*.sanity.io",
                            "media-src 'self' https://cdn.sanity.io blob:",
                            "frame-src 'self' https://map.naver.com https://www.google.com https://maps.google.com https://www.youtube.com",
                            "frame-ancestors 'self'",
                        ].join("; "),
                    },
                ],
            },
        ];
    },
};

export default analyzer(nextConfig);
