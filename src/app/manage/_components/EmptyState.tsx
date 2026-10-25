import Link from "next/link";

/** 목록이 비어 있을 때의 안내. 만들 수 없는 상태(쓰기 설정 전)에는 버튼 대신 설명만 보여 준다. */
export default function EmptyState({
    title,
    body,
    actionHref,
    actionLabel,
}: {
    title: string;
    body: string;
    actionHref?: string;
    actionLabel?: string;
}) {
    return (
        <div className="rounded-2xl border-2 border-dashed border-neutral-300 bg-white px-6 py-12 text-center">
            <div aria-hidden="true" className="mx-auto mb-4 w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center text-2xl text-neutral-400">
                +
            </div>
            <p className="text-base font-black mb-1.5">{title}</p>
            <p className="text-sm text-neutral-600 leading-relaxed break-keep max-w-sm mx-auto">{body}</p>
            {actionHref && actionLabel && (
                <Link
                    href={actionHref}
                    className="inline-flex h-11 px-5 mt-5 rounded-xl bg-black text-white text-sm font-bold items-center hover:bg-neutral-800 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                >
                    {actionLabel}
                </Link>
            )}
        </div>
    );
}
