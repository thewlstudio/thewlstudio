// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { flashToast, ToastProvider } from "./Toast";

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
const find = (text: string) => Array.from(host.querySelectorAll("button")).find((button) => button.textContent === text)!;
async function render() { await act(async () => root.render(<ToastProvider><p>관리 화면</p></ToastProvider>)); }
async function clickUndo() { await act(async () => find("되돌리기").click()); }

beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    vi.resetAllMocks();
    for (const fn of [crew, instructor, work, space]) fn.mockResolvedValue({ ok: true });
    sessionStorage.clear();
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); sessionStorage.clear(); });

describe("삭제 되돌리기 알림", () => {
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
