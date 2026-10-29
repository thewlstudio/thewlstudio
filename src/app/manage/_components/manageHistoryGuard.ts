import { confirmLeaveIfDirty } from "@/lib/formDirtyGuard";

// 설치된 DOM 타입에는 아직 Navigation API 전체가 없어 사용하는 표면만 정의한다.
type HistoryNavigateEvent = Event & {
    navigationType: string;
    destination: { url: string; sameDocument: boolean };
};

/** 지원 브라우저의 취소 가능한 동일 문서 뒤로/앞으로 이동만 보호한다. */
export function listenForManageHistoryLeave(enabled: () => boolean = () => true): () => void {
    const navigation = (window as Window & { navigation?: EventTarget }).navigation;
    if (!navigation?.addEventListener) return () => {};
    const onNavigate = (event: Event) => {
        if (!enabled()) return;
        const e = event as HistoryNavigateEvent;
        if (e.defaultPrevented || !e.cancelable || e.navigationType !== "traverse" || !e.destination?.sameDocument) return;
        const next = new URL(e.destination.url, window.location.href);
        // 같은 화면의 오류 요약·해시 이동은 입력을 없애지 않는다.
        if (next.origin === window.location.origin && next.pathname === window.location.pathname && next.search === window.location.search) return;
        if (!confirmLeaveIfDirty()) e.preventDefault();
    };
    navigation.addEventListener("navigate", onNavigate);
    return () => navigation.removeEventListener("navigate", onNavigate);
}
