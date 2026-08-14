import Link from "next/link";
import { logout } from "./actions";

/**
 * /manage 하위 화면(로그인 화면 제외)에서 공통으로 쓰는 상단 바.
 * 허브로 돌아가는 링크 + 현재 화면 제목 + 로그아웃을 한 곳에서 관리한다.
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
            <form action={logout}>
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
