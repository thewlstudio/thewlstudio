// @vitest-environment jsdom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DeleteInstructorButton from "../instructors/[id]/DeleteInstructorButton";
import DeleteCrewButton from "../crew/[id]/DeleteCrewButton";
import DeleteWorkButton from "../works/[id]/DeleteWorkButton";
import DeleteSpaceButton from "../studio/[id]/DeleteSpaceButton";
import DuplicateInstructorButton from "../instructors/[id]/DuplicateInstructorButton";
import RestoreButton from "./RestoreButton";
import { setFormDirty } from "@/lib/formDirtyGuard";

const { remove, duplicate, restore, push, refresh, flash, show, router } = vi.hoisted(() => {
    const push = vi.fn(), refresh = vi.fn();
    return { remove: vi.fn(), duplicate: vi.fn(), restore: vi.fn(), push, refresh, flash: vi.fn(), show: vi.fn(), router: { push, refresh } };
});
vi.mock("next/navigation", async (original) => ({ ...await original<typeof import("next/navigation")>(), useRouter: () => router }));
vi.mock("../instructors/actions", () => ({ deleteInstructor: remove, duplicateInstructor: duplicate }));
vi.mock("../crew/actions", () => ({ deleteCrew: remove }));
vi.mock("../works/actions", () => ({ deleteWork: remove }));
vi.mock("../studio/actions", () => ({ deleteSpace: remove }));
vi.mock("./Toast", () => ({ flashToast: flash, useToast: () => ({ show }) }));
type Result = { ok: true } | { ok: false; error: string };
let root: Root;
let host: HTMLDivElement;
async function render(node: ReactNode) { await act(async () => root.render(node)); }
function find(text: string) { return Array.from(host.querySelectorAll("button")).find((b) => b.textContent === text)!; }
async function click(text: string) { await act(async () => find(text).click()); }
async function escape() { await act(async () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))); }

beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    vi.resetAllMocks();
    setFormDirty(false);
    remove.mockResolvedValue({ ok: true });
    duplicate.mockResolvedValue({ ok: true, newId: "copy-1" });
    restore.mockResolvedValue({ ok: true });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); setFormDirty(false); vi.restoreAllMocks(); });

describe.each([
    { name: "강사", text: "이 강사 삭제하기", node: <DeleteInstructorButton documentId="id" instructorName="강사" /> },
    { name: "Crew", text: "이 크루 삭제하기", node: <DeleteCrewButton documentId="id" memberName="크루" /> },
    { name: "Works", text: "이 작품 삭제하기", node: <DeleteWorkButton documentId="id" workTitle="작품" /> },
    { name: "Studio", text: "이 공간 삭제하기", node: <DeleteSpaceButton documentId="id" spaceName="공간" /> },
])("$name 삭제 확인", ({ text, node }) => {
    it("대기 중 Escape·중복 클릭으로 작업 상태를 잃지 않는다", async () => {
        let finish!: (result: Result) => void;
        remove.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
        await render(node);
        await click(text);
        await act(async () => { const confirm = find("휴지통으로 이동"); confirm.click(); confirm.click(); });
        await escape();
        expect(remove).toHaveBeenCalledTimes(1);
        expect(host.querySelector('[role="alertdialog"]')).not.toBeNull();
        expect(find("취소").disabled).toBe(true);
        await act(async () => finish({ ok: false, error: "권한을 확인해 주세요." }));
        expect(host.textContent).toContain("권한을 확인해 주세요.");
        expect(push).not.toHaveBeenCalled();
    });
    it("취소와 Escape로 닫으면 새로 렌더링된 삭제 버튼으로 포커스를 돌린다", async () => {
        await render(node);
        await click(text);
        expect(document.activeElement).toBe(find("취소"));
        await click("취소");
        expect(document.activeElement).toBe(find(text));
        await click(text);
        await escape();
        expect(document.activeElement).toBe(find(text));
        expect(remove).not.toHaveBeenCalled();
    });
    it("통신 예외를 확인창에 남기며 성공 알림이나 이동을 하지 않는다", async () => {
        remove.mockRejectedValueOnce(new TypeError("offline"));
        await render(node);
        await click(text);
        await click("휴지통으로 이동");
        expect(host.querySelector('[role="alert"]')!.textContent).toContain("처리 결과를 확인하지 못했어요");
        expect(push).not.toHaveBeenCalled();
        expect(flash).not.toHaveBeenCalled();
        await click("휴지통으로 이동");
        expect(remove).toHaveBeenCalledTimes(2);
        expect(push).toHaveBeenCalledTimes(1);
    });
});

describe("복원·복제 버튼", () => {
    it("복원 통신 오류를 표시하고 성공하지 않은 알림은 띄우지 않는다", async () => {
        restore.mockRejectedValueOnce(new Error("offline"));
        await render(<RestoreButton documentId="id" restore={restore} />);
        await click("복원");
        expect(host.textContent).toContain("처리 결과를 확인하지 못했어요");
        expect(show).not.toHaveBeenCalled();
        expect(refresh).not.toHaveBeenCalled();
        await click("복원");
        expect(refresh).toHaveBeenCalledTimes(1);
    });
    it("복원을 연속 클릭해도 요청은 하나만 보낸다", async () => {
        let finish!: (result: Result) => void;
        restore.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
        await render(<RestoreButton documentId="id" restore={restore} />);
        await act(async () => { find("복원").click(); find("복원").click(); });
        expect(restore).toHaveBeenCalledTimes(1);
        await act(async () => finish({ ok: true }));
    });
    it("미저장 변경사항을 남겨 두고 복제 화면으로 이동하기 전 확인한다", async () => {
        setFormDirty(true);
        vi.mocked(window.confirm).mockReturnValueOnce(false);
        await render(<DuplicateInstructorButton documentId="id" />);
        await click("복제해서 새로 만들기");
        expect(duplicate).not.toHaveBeenCalled();
        await click("복제해서 새로 만들기");
        expect(push).toHaveBeenCalledWith("/manage/instructors/copy-1");
    });
    it("복제 통신 오류도 입력 화면에 안내하고 자동 재시도하지 않는다", async () => {
        duplicate.mockRejectedValueOnce(new Error("offline"));
        await render(<DuplicateInstructorButton documentId="id" />);
        await click("복제해서 새로 만들기");
        expect(host.textContent).toContain("새 탭에서 목록을 확인");
        expect(duplicate).toHaveBeenCalledTimes(1);
        expect(push).not.toHaveBeenCalled();
    });
});
