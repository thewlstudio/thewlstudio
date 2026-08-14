"use client";

import Link from "next/link";
import { logout } from "./actions";
import { confirmLeaveIfDirty } from "@/lib/formDirtyGuard";

/**
 * /manage 하위 화면(로그인 화면 제외)에서 공통으로 쓰는 상단 바.
 * 허브로 돌아가는 링크 + 현재 화면 제목 + 로그아웃을 한 곳에서 관리한다.
 *
 * 강사 수정/생성 화면처럼 폼에 미저장 변경사항이 있을 수 있는 페이지에서도
 * 그대로 쓰이므로, 두 액션(허브로 이동 / 로그아웃) 모두 formDirtyGuard를
 * 거쳐 실수로 변경사항을 잃어버리지 않게 확인한다. 폼이 없는 화면(허브,
 * 강사 목록)에서는 dirty 상태가 항상 false라 그냥 통과된다.
 */
export default function ManageNav({
    title,
    showHubLink = true,
}: {
    title: string;
    showHubLink?: boolean;
}) {
    return (
        <header className="flex items-start justify-between gap-4 mb-8">
            <div>
                {showHubLink && (
                    <Link
                        href="/manage"
                        onClick={(e) => {
                            if (!confirmLeaveIfDirty()) e.preventDefault();
                        }}
                        className="inline-block mb-2 text-sm font-semibold text-neutral-500 hover:text-black underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black rounded-sm"
                    >
                        ← 관리 허브
                    </Link>
                )}
                <p className="text-[10px] font-bold tracking-[0.35em] text-neutral-500 uppercase mb-1.5">
                    White Light Studio
                </p>
                <h1 className="text-2xl md:text-3xl font-black tracking-tight">{title}</h1>
            </div>
            <form
                action={logout}
                onSubmit={(e) => {
                    if (!confirmLeaveIfDirty()) e.preventDefault();
                }}
            >
                <button
                    type="submit"
                    className="text-sm font-semibold text-neutral-500 hover:text-black transition-colors underline underline-offset-4 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black rounded-sm"
                >
                    나가기
                </button>
            </form>
        </header>
    );
}
