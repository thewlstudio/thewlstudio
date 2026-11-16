// @vitest-environment jsdom
import { act, StrictMode, Suspense, useEffect, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { flashToast, ToastProvider, useToast } from "./Toast";
import { isManageMutationPending } from "@/lib/manage-mutation-lock";
import { setFormDirty } from "@/lib/formDirtyGuard";

const { crew, instructor, work, space, refresh, router } = vi.hoisted(() => {
    const refresh = vi.fn();
    return { crew: vi.fn(), instructor: vi.fn(), work: vi.fn(), space: vi.fn(), refresh, router: { refresh } };
});
vi.mock("next/navigation", async (original) => ({ ...await original<typeof import("next/navigation")>(), useRouter: () => router, usePathname: () => "/manage/crew" }));
vi.mock("../crew/actions", () => ({ restoreCrew: crew }));
vi.mock("../instructors/actions", () => ({ restoreInstructor: instructor }));
vi.mock("../works/actions", () => ({ restoreWork: work }));
vi.mock("../studio/actions", () => ({ restoreSpace: space }));
let root: Root;
let host: HTMLDivElement;
let originalUrl: string;
let originalHistoryState: unknown;
const find = (text: string) => Array.from(host.querySelectorAll("button")).find((button) => button.textContent === text)!;
async function render() { await act(async () => root.render(<ToastProvider><p>관리 화면</p></ToastProvider>)); }
async function clickUndo() { await act(async () => find("되돌리기").click()); }
function NoticeControls({ count = 1, undo = false }: { count?: number; undo?: boolean }) {
    const toast = useToast();
    return <button onClick={() => {
        for (let index = 0; index < count; index++) toast.show({ message: `테스트 안내 ${index}`, ...(undo ? { undo: { area: "crew" as const, id: `fixture-${index}` } } : {}) });
    }}>테스트 알림 추가</button>;
}

beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    vi.resetAllMocks();
    originalUrl = window.location.href; originalHistoryState = window.history.state;
    for (const fn of [crew, instructor, work, space]) fn.mockResolvedValue({ ok: true });
    sessionStorage.clear();
    setFormDirty(false);
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
});
afterEach(async () => {
    await act(async () => root.unmount()); host.remove(); sessionStorage.clear();
    vi.useRealTimers(); vi.restoreAllMocks();
    setFormDirty(false);
    window.history.replaceState(originalHistoryState, "", originalUrl);
});

describe("알림의 생성 안내와 표시 수명", () => {
    it("다른 알림이 추가돼도 이전 알림의 5초 만료 시점을 연장하지 않는다", async () => {
        vi.useFakeTimers(); flashToast({ message: "먼저 표시한 안내" });
        await act(async () => root.render(<ToastProvider><NoticeControls /></ToastProvider>));
        await act(async () => vi.advanceTimersByTime(4000));
        await act(async () => find("테스트 알림 추가").click());
        await act(async () => vi.advanceTimersByTime(1000));
        expect(host.textContent).not.toContain("먼저 표시한 안내"); expect(host.textContent).toContain("테스트 안내 0");
        await act(async () => vi.advanceTimersByTime(4000));
        expect(host.textContent).not.toContain("테스트 안내 0");
    });
    it("표시 한도에서 밀려난 알림의 타이머도 남기지 않는다", async () => {
        vi.useFakeTimers();
        await act(async () => root.render(<ToastProvider><NoticeControls count={6} /></ToastProvider>));
        await act(async () => find("테스트 알림 추가").click());
        expect(host.querySelectorAll('[aria-label="알림 닫기"]')).toHaveLength(3);
        expect(host.textContent).not.toContain("테스트 안내 0"); expect(host.textContent).toContain("테스트 안내 5");
        expect(vi.getTimerCount()).toBe(3);
    });
    it("직접 닫으면 예약된 타이머를 즉시 해제한다", async () => {
        vi.useFakeTimers(); flashToast({ message: "테스트 안내" }); await render();
        await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="알림 닫기"]')!.click());
        // jsdom이 DOM 제거에 예약한 0ms 작업과 알림의 5초 타이머를 구분한다.
        await act(async () => vi.advanceTimersByTime(0));
        expect(host.textContent).toBe("관리 화면"); expect(vi.getTimerCount()).toBe(0);
    });
    it("알림 제공자가 사라지면 모든 만료 타이머를 해제한다", async () => {
        vi.useFakeTimers(); flashToast({ message: "테스트 안내" }); await render();
        await act(async () => root.render(<p>다른 화면</p>));
        await act(async () => vi.advanceTimersByTime(0));
        expect(vi.getTimerCount()).toBe(0); expect(isManageMutationPending()).toBe(false);
    });
    it("생성 안내는 created 표시만 제거하고 섹션·다른 조건과 기록 길이를 보존한다", async () => {
        history.replaceState(null, "", "/manage/crew?created=1&filter=a%2Bb&tag=one&tag=two#profile-section");
        const replace = vi.spyOn(history, "replaceState");
        const length = history.length;
        await render();
        expect(host.textContent).toContain("새로 만들었어요");
        expect(location.hash).toBe("#profile-section");
        expect(new URL(location.href).searchParams.getAll("tag")).toEqual(["one", "two"]);
        expect(new URL(location.href).searchParams.get("filter")).toBe("a+b");
        expect(new URL(location.href).searchParams.has("created")).toBe(false);
        expect(history.length).toBe(length);
        // Next가 자체 탐색 상태를 복사·동기화하는 기존 외부 History API 호출 방식을 유지한다.
        expect(replace).toHaveBeenCalledWith(null, "", "/manage/crew?filter=a%2Bb&tag=one&tag=two#profile-section");
        expect(refresh).not.toHaveBeenCalled(); expect(crew).not.toHaveBeenCalled();
    });
    it("StrictMode에서도 생성 알림은 한 번만 표시하고 5초 뒤 해제한다", async () => {
        vi.useFakeTimers(); history.replaceState(null, "", "/manage/crew?created=1");
        await act(async () => root.render(<StrictMode><ToastProvider><p>관리 화면</p></ToastProvider></StrictMode>));
        expect(host.textContent?.match(/새로 만들었어요/g)).toHaveLength(1);
        await act(async () => vi.advanceTimersByTime(5000));
        expect(host.textContent).toBe("관리 화면");
    });
    it("StrictMode에서도 예약된 삭제 알림은 10초 동안 되돌릴 수 있고 이후 해제한다", async () => {
        vi.useFakeTimers(); flashToast({ message: "테스트 삭제 안내", undo: { area: "crew", id: "fixture" } });
        await act(async () => root.render(<StrictMode><ToastProvider><p>관리 화면</p></ToastProvider></StrictMode>));
        await act(async () => vi.advanceTimersByTime(9999)); expect(find("되돌리기")).toBeDefined();
        await act(async () => vi.advanceTimersByTime(1)); expect(find("되돌리기")).toBeUndefined();
        expect(crew).not.toHaveBeenCalled();
    });
});

describe("삭제 되돌리기 알림", () => {
    it("미저장 변경 경고를 취소하면 알림과 입력 보호를 유지하고 복원하지 않는다", async () => {
        const confirm = vi.spyOn(window, "confirm").mockReturnValue(false); setFormDirty(true);
        flashToast({ message: "테스트 삭제 안내", undo: { area: "crew", id: "fixture" } }); await render(); await clickUndo();
        expect(confirm).toHaveBeenCalledTimes(1); expect(crew).not.toHaveBeenCalled(); expect(refresh).not.toHaveBeenCalled();
        expect(host.textContent).toContain("테스트 삭제 안내"); expect(isManageMutationPending()).toBe(false);
    });
    it("같은 순간 서로 다른 알림을 되돌려도 한 요청만 전송한다", async () => {
        let finish!: (value: { ok: true }) => void;
        crew.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
        const alert = vi.spyOn(window, "alert").mockImplementation(() => {});
        await act(async () => root.render(<ToastProvider><NoticeControls count={2} undo /></ToastProvider>));
        await act(async () => find("테스트 알림 추가").click());
        const buttons = Array.from(host.querySelectorAll("button")).filter((button) => button.textContent === "되돌리기");
        await act(async () => { buttons[0].click(); buttons[1].click(); });
        try {
            expect(crew).toHaveBeenCalledTimes(1); expect(alert).toHaveBeenCalledTimes(1); expect(isManageMutationPending()).toBe(true);
        } finally { await act(async () => finish({ ok: true })); }
        expect(isManageMutationPending()).toBe(false); expect(crew).toHaveBeenCalledTimes(1);
    });
    it.each([["crew", crew], ["instructors", instructor], ["works", work], ["studio", space]] as const)("%s 복원 후 refresh 오류는 성공 알림 대신 완료·갱신 실패를 안내한다", async (area, restore) => {
        refresh.mockImplementationOnce(() => { throw new Error("DO_NOT_ECHO"); });
        flashToast({ message: "휴지통으로 옮겼어요.", undo: { area, id: "document-1" } }); await render(); await clickUndo();
        expect(host.textContent).toContain("복원은 완료됐지만"); expect(host.textContent).not.toContain("복원했어요.");
        expect(host.textContent).not.toContain("DO_NOT_ECHO"); expect(find("되돌리기")).toBeUndefined();
        expect(restore).toHaveBeenCalledTimes(1); expect(refresh).toHaveBeenCalledTimes(1); expect(isManageMutationPending()).toBe(false);
    });
    it("되돌리기 후 새로고침 전환이 지연돼도 공유 잠금을 유지한다", async () => {
        let ready = false; let finish!: () => void;
        const wait = new Promise<void>((resolve) => { finish = () => { ready = true; resolve(); }; });
        function Slow() { if (!ready) throw wait; return <p>갱신 완료</p>; }
        function Screen() {
            const [moving, setMoving] = useState(false);
            useEffect(() => { refresh.mockImplementation(() => setMoving(true)); }, []);
            return <ToastProvider><p>관리 화면</p>{moving && <Slow />}</ToastProvider>;
        }
        flashToast({ message: "휴지통으로 옮겼어요.", undo: { area: "crew", id: "document-1" } });
        await act(async () => root.render(<Suspense fallback={<p>갱신 중</p>}><Screen /></Suspense>));
        try {
            await clickUndo(); expect(isManageMutationPending()).toBe(true); expect(crew).toHaveBeenCalledTimes(1);
        } finally { await act(async () => finish()); }
        expect(isManageMutationPending()).toBe(false);
    });
    it.each([
        ["crew", crew], ["instructors", instructor], ["works", work], ["studio", space],
    ] as const)("%s 영역의 올바른 복원 액션만 호출한다", async (area, restore) => {
        flashToast({ message: "휴지통으로 옮겼어요.", undo: { area, id: "document-1" } });
        await render();
        await clickUndo();
        expect(restore).toHaveBeenCalledWith("document-1");
        expect(host.textContent).toContain("복원했어요.");
        expect(refresh).toHaveBeenCalledTimes(1);
    });
    it("통신 예외를 성공으로 표시하거나 자동 재시도하지 않는다", async () => {
        crew.mockRejectedValueOnce(new TypeError("offline"));
        flashToast({ message: "휴지통으로 옮겼어요.", undo: { area: "crew", id: "id" } });
        await render();
        await clickUndo();
        expect(host.textContent).toContain("처리 결과를 확인하지 못했어요");
        expect(host.textContent).not.toContain("복원했어요.");
        expect(crew).toHaveBeenCalledTimes(1);
        expect(refresh).not.toHaveBeenCalled();
    });
    it("같은 알림을 연속 클릭해도 복원 요청은 한 번만 보낸다", async () => {
        let finish!: (value: { ok: true }) => void;
        crew.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
        flashToast({ message: "휴지통으로 옮겼어요.", undo: { area: "crew", id: "id" } });
        await render();
        await act(async () => { const undo = find("되돌리기"); undo.click(); undo.click(); });
        expect(crew).toHaveBeenCalledTimes(1);
        await act(async () => finish({ ok: true }));
    });
    it.each(["not json", "null", '{"message":{"bad":"object"}}'])("손상된 저장값이 있어도 관리 화면을 유지한다: %s", async (raw) => {
        sessionStorage.setItem("wls_manage_flash", raw);
        await render();
        expect(host.textContent).toBe("관리 화면");
    });
    it("잘못된 되돌리기 영역은 메시지만 표시하고 실행 버튼은 생략한다", async () => {
        sessionStorage.setItem("wls_manage_flash", JSON.stringify({ message: "삭제 결과", undo: { area: "constructor", id: "id" } }));
        await render();
        expect(host.textContent).toContain("삭제 결과");
        expect(find("되돌리기")).toBeUndefined();
        expect(crew).not.toHaveBeenCalled();
    });
});
