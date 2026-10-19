import Link from "next/link";
import { formatAbsolute, formatUpdated } from "@/lib/format-updated";

/** 수정 화면 제목 아래의 "마지막 수정" 표시. 마우스를 올리면 정확한 시각이 나온다. */
export default function UpdatedAt({ iso, historyHref }: { iso?: string | null; historyHref?: string }) {
    const text = formatUpdated(iso);
    if (!iso || !text) return null;
    // 최근(오늘·어제 등)일 때만 "3시간 전" 같은 상대 표현을 덧붙인다
    const relative = /전 수정$|방금 수정$|어제 수정$/.test(text) ? ` (${text.replace(" 수정", "")})` : "";
    return (
        <p className="text-sm text-neutral-500 mt-1">
            마지막 수정:{" "}
            <time dateTime={iso} title={formatAbsolute(iso)}>
                {formatAbsolute(iso)}
                {relative}
            </time>
            {historyHref && (
                <>
                    {" · "}
                    <Link href={historyHref} className="font-semibold underline underline-offset-4 hover:text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black rounded-sm">
                        변경 이력 보기
                    </Link>
                </>
            )}
        </p>
    );
}
