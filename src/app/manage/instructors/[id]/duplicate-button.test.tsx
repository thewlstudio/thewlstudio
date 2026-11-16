// @vitest-environment jsdom
import { act, Suspense, useEffect, useState, type ComponentProps } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DuplicateInstructorButton from "./DuplicateInstructorButton";
import { isManageMutationPending } from "@/lib/manage-mutation-lock";
import { setFormDirty } from "@/lib/formDirtyGuard";
import { CREATED_REFRESH_FAILED } from "@/lib/manage-create-result";

const { duplicate, push, router } = vi.hoisted(() => {
    const push = vi.fn(); return { duplicate: vi.fn(), push, router: { push } };
});
vi.mock("../actions", () => ({ duplicateInstructor: duplicate }));
vi.mock("next/navigation", async (original) => ({ ...await original<typeof import("next/navigation")>(), useRouter: () => router }));
vi.mock("next/link", () => ({
    // Next의 현재 탭 onNavigate 계약만 모사한다. 실제 탐색은 하지 않는다.
    default: ({ href, onNavigate, children, ...props }: ComponentProps<typeof import("next/link").default>) => <a {...props} href={String(href)} onClick={(event) => {
        event.preventDefault(); let prevented = false;
        onNavigate?.({ preventDefault: () => { prevented = true; } });
        if (!prevented) push(href);
    }}>{children}</a>,
}));
let root: Root; let host: HTMLDivElement;
const button = () => host.querySelector("button")!;
async function click() { await act(async () => button().click()); }
async function render(id = "source") { await act(async () => root.render(<DuplicateInstructorButton documentId={id} />)); }
beforeEach(async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true }); vi.resetAllMocks(); setFormDirty(false);
    history.replaceState(null, "", "/manage/instructors/source"); vi.spyOn(window, "confirm").mockReturnValue(true);
    duplicate.mockResolvedValue({ ok: true, newId: "copy-1" });
    host = document.createElement("div"); document.body.appendChild(host); root = createRoot(host); await render();
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); setFormDirty(false); vi.restoreAllMocks(); });

describe("강사 복제의 확인된 생성·이동 실패", () => {
    it("이동 호출 실패면 복제 완료를 안내하고 재복제 대신 기존 복사본 링크를 제공한다", async () => {
        push.mockImplementationOnce(() => { throw new Error("DO_NOT_ECHO"); }); await click();
        expect(host.querySelector('[role="alert"]')?.textContent).toContain("복제는 완료됐지만");
        expect(host.textContent).not.toContain("DO_NOT_ECHO"); expect(button().disabled).toBe(true); expect(button().textContent).toBe("복제 완료");
        expect(host.querySelector("a")?.getAttribute("href")).toBe("/manage/instructors/copy-1");
        expect(isManageMutationPending()).toBe(false); await click(); expect(duplicate).toHaveBeenCalledTimes(1); expect(push).toHaveBeenCalledTimes(1);
    });
    it("복사본 열기에도 미저장 경고를 적용하며 추가 복제 요청은 하지 않는다", async () => {
        push.mockImplementationOnce(() => { throw new Error("offline navigation"); }); await click();
        setFormDirty(true); vi.mocked(window.confirm).mockReturnValueOnce(false);
        const link = host.querySelector("a")!;
        await act(async () => link.click()); expect(push).toHaveBeenCalledTimes(1); expect(duplicate).toHaveBeenCalledTimes(1);
        await act(async () => link.click()); expect(push).toHaveBeenLastCalledWith("/manage/instructors/copy-1");
        expect(push).toHaveBeenCalledTimes(2); expect(duplicate).toHaveBeenCalledTimes(1); expect(window.confirm).toHaveBeenCalledTimes(2);
    });
    it("원본 ID를 복제 성공의 새 ID로 인정하지 않는다", async () => {
        duplicate.mockResolvedValue({ ok: true, newId: "source" }); await click();
        expect(push).not.toHaveBeenCalled(); expect(host.textContent).toContain("새 탭에서 목록을 확인"); expect(button().disabled).toBe(false);
    });
    it("상속된 새 ID도 복제 성공으로 추측하지 않는다", async () => {
        duplicate.mockResolvedValue(Object.assign(Object.create({ newId: "copy-1" }), { ok: true })); await click();
        expect(push).not.toHaveBeenCalled(); expect(host.textContent).toContain("새 탭에서 목록을 확인");
    });
    it("같은 프레임에 연속 클릭해도 복제 요청은 한 번이다", async () => {
        let finish!: (value: { ok: true; newId: string }) => void;
        duplicate.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
        await act(async () => { button().click(); button().click(); });
        expect(duplicate).toHaveBeenCalledTimes(1); expect(button().disabled).toBe(true);
        await act(async () => finish({ ok: true, newId: "copy-1" })); expect(push).toHaveBeenCalledExactlyOnceWith("/manage/instructors/copy-1");
    });
    it("이동 전환이 지연되면 다른 복제 요청을 막는 공유 잠금을 유지한다", async () => {
        let ready = false; let finish!: () => void;
        const wait = new Promise<void>((resolve) => { finish = () => { ready = true; resolve(); }; });
        function Slow() { if (!ready) throw wait; return <p>이동 완료</p>; }
        function Screen() {
            const [moving, setMoving] = useState(false); useEffect(() => { push.mockImplementation(() => setMoving(true)); }, []);
            return <><DuplicateInstructorButton documentId="source" />{moving && <Slow />}</>;
        }
        await act(async () => root.render(<Suspense fallback={<p>이동 중</p>}><Screen /></Suspense>));
        try { await click(); expect(isManageMutationPending()).toBe(true); expect(button().disabled).toBe(true); }
        finally { await act(async () => finish()); }
        expect(isManageMutationPending()).toBe(false);
    });
    it.each([{ ok: true, newId: "copy-1" }, { ok: false, error: "이전 요청 안내" }])("주소 변경 뒤 늦은 응답 #%#는 이전 화면 효과를 실행하지 않는다", async (result) => {
        let finish!: (value: typeof result) => void;
        duplicate.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; })); await click();
        history.replaceState(null, "", "/manage/other"); await act(async () => finish(result));
        expect(push).not.toHaveBeenCalled(); expect(host.querySelector("a")).toBeNull(); expect(host.querySelector('[role="alert"]')).toBeNull(); expect(isManageMutationPending()).toBe(false);
    });
    it("서버의 생성 확인 후 갱신 실패 안내는 그대로 표시하며 성공 링크를 추측하지 않는다", async () => {
        duplicate.mockResolvedValue({ ok: false, error: CREATED_REFRESH_FAILED }); await click();
        expect(host.querySelector('[role="alert"]')?.textContent).toBe(CREATED_REFRESH_FAILED); expect(host.querySelector("a")).toBeNull(); expect(push).not.toHaveBeenCalled();
    });
    it.each([null, { ok: "true", newId: "copy-1" }])("비정상 결과 #%#로는 이동하지 않는다", async (value) => {
        duplicate.mockResolvedValue(value); await click(); expect(push).not.toHaveBeenCalled(); expect(host.textContent).toContain("새 탭에서 목록을 확인");
    });
    it("알고 있는 복사본 상태를 다른 원본 강사의 버튼에 적용하지 않는다", async () => {
        push.mockImplementationOnce(() => { throw new Error("offline navigation"); }); await click(); await render("other-source");
        expect(button().disabled).toBe(false); expect(host.querySelector("a")).toBeNull(); expect(host.querySelector('[role="alert"]')).toBeNull();
        await click(); expect(duplicate).toHaveBeenLastCalledWith("other-source"); expect(duplicate).toHaveBeenCalledTimes(2);
    });
});
