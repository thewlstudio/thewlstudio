"use client";

import Link from "./_components/GuardedLink";

/** 관리 화면 안에서 예기치 못한 오류가 났을 때의 안내 (사이트 전체 오류 화면 대신) */
export default function ManageError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
    return (
        <main id="main-content" className="max-w-md mx-auto px-5 py-20 text-center">
            <h1 className="text-2xl font-black tracking-tight mb-3">화면을 불러오지 못했어요</h1>
            <p className="text-sm text-neutral-600 leading-relaxed mb-6 break-keep">
                잠시 뒤 다시 시도해 주세요. 계속되면 개발자에게 알려 주세요. 작성 중이던 내용이 있었다면 저장되지 않았을 수 있어요.
            </p>
            <div className="flex items-center justify-center gap-3">
                <button
                    type="button"
                    onClick={reset}
                    className="h-11 px-5 rounded-xl bg-black text-white text-sm font-bold hover:bg-neutral-800 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                >
                    다시 시도
                </button>
                <Link
                    href="/manage"
                    className="h-11 px-5 rounded-xl border border-neutral-300 text-sm font-bold flex items-center hover:bg-neutral-100 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                >
                    관리 허브로
                </Link>
            </div>
        </main>
    );
}
