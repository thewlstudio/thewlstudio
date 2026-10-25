"use client";

/**
 * 허브의 "처음 설정" 체크리스트 진행 기록. 브라우저 localStorage에만 저장한다. (설계: docs/ONBOARDING_DESIGN.md)
 * 항목은 사용자가 직접 체크하지 않고, 방문·저장·클릭 같은 행동이 일어나면 자동으로 완료된다.
 */
export const STEPS = [
    { id: "help", title: "사용 안내 둘러보기", desc: "질문별 답이 모여 있어요.", href: "/manage/help", cta: "열기" },
    { id: "contact", title: "연락처·링크가 맞는지 확인하기", desc: "전화번호, 주소, 지도, 예약 링크를 훑어보세요.", href: "/manage/contact", cta: "확인하기" },
    { id: "intro-save", title: "홈페이지 소개 문구 고쳐서 저장해 보기", desc: "Contact 맨 아래에서 바꾸고 저장하기를 눌러 보세요.", href: "/manage/contact", cta: "고치러 가기" },
    { id: "content-save", title: "강사·Crew·Works·Studio 중 하나 고쳐서 저장하기", desc: "어느 것이든 좋아요. 작은 오타 하나를 고쳐도 돼요.", href: "/manage/works", cta: "고르러 가기" },
    { id: "view-site", title: "홈페이지에서 결과 확인하기", desc: "허브의 ‘홈페이지 보기’를 눌러 바뀐 모습을 보세요.", href: "/", cta: "홈페이지 열기" },
] as const;

export type StepId = (typeof STEPS)[number]["id"];

const DONE_KEY = "wls_checklist_v1";
const HIDDEN_KEY = "wls_checklist_hidden_v1";
const EVT = "wls-checklist-change";

function read<T>(key: string, fallback: T): T {
    try {
        const raw = localStorage.getItem(key);
        return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
        return fallback;
    }
}
function write(key: string, value: unknown) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
        /* 저장소를 못 쓰면 체크 기록만 남지 않는다 */
    }
    window.dispatchEvent(new Event(EVT));
}

export const checklist = {
    done: () => read<string[]>(DONE_KEY, []),
    /** 문자열 스냅샷 — useSyncExternalStore가 값 비교로 변경을 감지한다 */
    snapshot: () => `${read<string[]>(DONE_KEY, []).join(",")}|${read<boolean>(HIDDEN_KEY, false) ? "h" : ""}`,
    mark: (id: StepId) => {
        const done = read<string[]>(DONE_KEY, []);
        if (!done.includes(id)) write(DONE_KEY, [...done, id]);
    },
    /** 저장이 성공한 화면 주소로 어떤 항목을 완료할지 정한다 */
    markSave: (pathname: string) => {
        if (pathname === "/manage/contact") checklist.mark("intro-save");
        else if (/^\/manage\/(crew|instructors|works|studio)\/[^/]+$/.test(pathname) || pathname === "/manage/studio/info") checklist.mark("content-save");
    },
    setHidden: (v: boolean) => write(HIDDEN_KEY, v),
    reset: () => {
        write(DONE_KEY, []);
        write(HIDDEN_KEY, false);
    },
    subscribe: (cb: () => void) => {
        window.addEventListener(EVT, cb);
        window.addEventListener("storage", cb);
        return () => {
            window.removeEventListener(EVT, cb);
            window.removeEventListener("storage", cb);
        };
    },
};
