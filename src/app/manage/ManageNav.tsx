"use client";

import Link from "./_components/GuardedLink";
import { logout } from "./actions";
import { confirmLeaveIfDirty } from "@/lib/formDirtyGuard";
import TourButton from "./_components/tour/TourButton";
import { useState } from "react";
import { useManageMutation } from "./_components/useManageMutation";
import { callManageAction } from "./_components/callManageAction";

/**
 * /manage 하위 화면(로그인 화면 제외)에서 공통으로 쓰는 상단 바.
 * 허브로 돌아가는 링크 + 현재 화면 제목 + 로그아웃을 한 곳에서 관리한다.
 *
 * 강사 수정/생성 화면처럼 폼에 미저장 변경사항이 있을 수 있는 페이지에서도
 * 그대로 쓰이므로, 두 액션(허브로 이동 / 로그아웃) 모두 formDirtyGuard를
 * 거쳐 실수로 변경사항을 잃어버리지 않게 확인한다. 내부 링크는 실제 Next
 * 탐색만 검사하므로 새 탭 클릭에는 묻지 않는다. 저장 중에는 이동·로그아웃을
 * 막고, 폼이 없는 화면(허브·목록)에서는 확인 없이 통과한다.
 */
export default function ManageNav({
    title,
    showHubLink = true,
}: {
    title: string;
    showHubLink?: boolean;
}) {
    const mutation = useManageMutation();
    const [error, setError] = useState<string | null>(null);
    return (
        <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 mb-8">
            <div className="min-w-[13rem] flex-1">
                {showHubLink && (
                    <Link
                        href="/manage"
                        className="inline-block mb-1 py-2 text-sm font-semibold text-neutral-500 hover:text-black underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black rounded-sm"
                    >
                        ← 관리 허브
                    </Link>
                )}
                <p className="text-[10px] font-bold tracking-[0.35em] text-neutral-500 uppercase mb-1.5">
                    White Light Studio
                </p>
                <h1 className="text-2xl md:text-3xl font-black tracking-tight break-keep">{title}</h1>
            </div>
            <div className="flex items-center gap-3 shrink-0 ml-auto">
            <TourButton />
            <Link
                data-tour="nav-help"
                href="/manage/help"
                className="text-sm font-semibold text-neutral-500 hover:text-black transition-colors underline underline-offset-4 min-h-11 px-1 flex items-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black rounded-sm"
            >
                사용 안내
            </Link>
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    if (!confirmLeaveIfDirty()) return;
                    mutation.run(async (isCurrent) => {
                        setError(null);
                        const result = await callManageAction(async () => { await logout(); return { ok: true }; });
                        if (isCurrent() && !result.ok) setError(result.error);
                    });
                }}
            >
                <button
                    type="submit"
                    disabled={mutation.isBusy}
                    className="text-sm font-semibold text-neutral-500 hover:text-black transition-colors underline underline-offset-4 min-h-11 px-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black rounded-sm"
                >
                    {mutation.isPending ? "로그아웃 중…" : "로그아웃"}
                </button>
                {error && <p role="alert" className="text-sm font-semibold text-red-600 mt-1">{error}</p>}
            </form>
            </div>
        </header>
    );
}
