/** "마지막 수정" 표시용 시각 문구 (한국 시간 기준). 서버 컴포넌트에서 쓴다. */
const KST = "Asia/Seoul";

const dayKey = (d: Date) => new Intl.DateTimeFormat("sv-SE", { timeZone: KST }).format(d); // YYYY-MM-DD

export function formatAbsolute(iso: string): string {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("ko-KR", {
        timeZone: KST,
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    }).format(d);
}

/** 예: "방금 수정", "5분 전 수정", "3시간 전 수정", "어제 수정", "10월 18일 수정", "2025년 3월 2일 수정" */
export function formatUpdated(iso: string | undefined | null, now: Date = new Date()): string | null {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    const diff = now.getTime() - d.getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return "방금 수정";
    if (min < 60) return `${min}분 전 수정`;
    if (dayKey(d) === dayKey(now)) return `${Math.floor(min / 60)}시간 전 수정`;
    const yesterday = new Date(now.getTime() - 86400000);
    if (dayKey(d) === dayKey(yesterday)) return "어제 수정";
    const sameYear = dayKey(d).slice(0, 4) === dayKey(now).slice(0, 4);
    const text = new Intl.DateTimeFormat("ko-KR", {
        timeZone: KST,
        ...(sameYear ? {} : { year: "numeric" }),
        month: "long",
        day: "numeric",
    }).format(d);
    return `${text} 수정`;
}
