"use client";

import { useEffect, useRef } from "react";
import { SITE_NAME } from "@/config/site";
import { focusPageElement } from "@/lib/page-focus";

export default function GlobalError({
    error,
    retry,
}: {
    error: unknown;
    retry: () => void;
}) {
    const titleRef = useRef<HTMLHeadingElement>(null);
    useEffect(() => {
        console.error("[GlobalError]", error);
    }, [error]);
    useEffect(() => {
        if (document.activeElement === document.body) focusPageElement(titleRef.current);
    }, []);

    return (
        <html lang="ko">
            <head>
                <title>{`문제가 발생했습니다 | ${SITE_NAME}`}</title>
                <meta name="robots" content="noindex, nofollow" />
            </head>
            <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, sans-serif" }}>
                <main id="main-content" style={{
                    minHeight: "100vh",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#000",
                    color: "#fff",
                    padding: "1.5rem",
                    textAlign: "center",
                }}>
                    <h1 ref={titleRef} id="page-title" tabIndex={-1} style={{ fontSize: "1.875rem", fontWeight: 900, letterSpacing: "-0.025em", marginBottom: "1rem" }}>
                        문제가 발생했습니다
                    </h1>
                    <p style={{ color: "#999", marginBottom: "2rem", maxWidth: "28rem" }}>
                        예기치 않은 오류가 발생했습니다. 아래 버튼을 눌러 다시 시도해 주세요.
                    </p>
                    <div style={{ display: "flex", gap: "1rem" }}>
                        <button
                            type="button"
                            onClick={retry}
                            style={{
                                padding: "0.75rem 1.5rem",
                                backgroundColor: "#fff",
                                color: "#000",
                                fontWeight: 600,
                                borderRadius: "0.5rem",
                                border: "none",
                                cursor: "pointer",
                                fontSize: "0.875rem",
                            }}
                        >
                            다시 시도
                        </button>
                        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- global-error는 루트 레이아웃 밖이므로 next/link 사용 불가 */}
                        <a
                            href="/"
                            style={{
                                padding: "0.75rem 1.5rem",
                                border: "1px solid #fff",
                                color: "#fff",
                                fontWeight: 600,
                                borderRadius: "0.5rem",
                                textDecoration: "none",
                                fontSize: "0.875rem",
                            }}
                        >
                            홈으로
                        </a>
                    </div>
                </main>
            </body>
        </html>
    );
}
