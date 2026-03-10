"use client";

import { useEffect } from "react";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("[GlobalError]", error);
    }, [error]);

    return (
        <html lang="ko">
            <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, sans-serif" }}>
                <div style={{
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
                    <h1 style={{ fontSize: "1.875rem", fontWeight: 900, letterSpacing: "-0.025em", marginBottom: "1rem" }}>
                        문제가 발생했습니다
                    </h1>
                    <p style={{ color: "#999", marginBottom: "2rem", maxWidth: "28rem" }}>
                        예기치 않은 오류가 발생했습니다. 아래 버튼을 눌러 다시 시도해 주세요.
                    </p>
                    <div style={{ display: "flex", gap: "1rem" }}>
                        <button
                            onClick={reset}
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
                </div>
            </body>
        </html>
    );
}
