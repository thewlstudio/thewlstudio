"use client";

import { useEffect, useState } from "react";

/**
 * 로그인(12시간) 만료가 가까워지면 알려 준다. 만료되면 저장이 실패하므로,
 * 작성 중인 내용이 화면에 그대로 있다는 점과 새 탭에서 다시 로그인하는 방법을 함께 안내한다.
 */
const WARN_MS = 15 * 60 * 1000;

export default function SessionWatcher({ expiresAt }: { expiresAt: number }) {
    const [now, setNow] = useState<number | null>(null);
    useEffect(() => {
        const tick = () => setNow(Date.now());
        tick();
        const id = setInterval(tick, 30_000);
        return () => clearInterval(id);
    }, []);
    if (now === null) return null;
    const left = expiresAt - now;
    if (left > WARN_MS) return null;
    const expired = left <= 0;
    const minutes = Math.max(1, Math.ceil(left / 60000));

    return (
        <div role="status" aria-live="polite" className="fixed top-3 left-1/2 -translate-x-1/2 z-[70] max-w-md w-[calc(100%-2rem)] rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 shadow-lg">
            <p className="text-sm font-bold text-amber-900">
                {expired ? "로그인이 만료됐어요." : `약 ${minutes}분 뒤에 로그인이 만료돼요.`}
            </p>
            <p className="text-sm text-amber-900 mt-0.5 leading-relaxed">
                작성 중인 내용은 이 화면에 그대로 있어요.{" "}
                <a href="/manage/login" target="_blank" rel="noopener noreferrer" className="font-bold underline underline-offset-4">
                    새 탭에서 다시 로그인
                </a>
                한 뒤 이 화면으로 돌아와 저장해 주세요.
            </p>
        </div>
    );
}
