// @vitest-environment jsdom
import { act, Suspense, useEffect, useState, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DeleteInstructorButton from "../instructors/[id]/DeleteInstructorButton";
import DeleteCrewButton from "../crew/[id]/DeleteCrewButton";
import DeleteWorkButton from "../works/[id]/DeleteWorkButton";
import DeleteSpaceButton from "../studio/[id]/DeleteSpaceButton";
import DuplicateInstructorButton from "../instructors/[id]/DuplicateInstructorButton";
import RestoreButton from "./RestoreButton";
import { setFormDirty } from "@/lib/formDirtyGuard";
import { PATCH_REFRESH_FAILED, UNKNOWN_PATCH_RESULT } from "@/lib/manage-patch-result";
import { isManageMutationPending } from "@/lib/manage-mutation-lock";

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
    it("확인된 휴지통 이동 뒤 화면 이동 오류는 완료 안내로 구분하고 알림을 예약하지 않는다", async () => {
        push.mockImplementationOnce(() => { throw new Error("DO_NOT_ECHO"); });
        await render(node); await click(text); await click("휴지통으로 이동");
        expect(host.querySelector('[role="alert"]')?.textContent).toContain("휴지통으로 옮겼지만");
        expect(host.textContent).not.toContain("DO_NOT_ECHO"); expect(flash).not.toHaveBeenCalled();
        expect(remove).toHaveBeenCalledTimes(1); expect(push).toHaveBeenCalledTimes(1); expect(isManageMutationPending()).toBe(false);
    });
    it("정상 이동 호출 뒤에만 원래의 되돌리기 알림을 예약한다", async () => {
        await render(node); await click(text); await click("휴지통으로 이동");
        expect(push).toHaveBeenCalledTimes(1); expect(flash).toHaveBeenCalledTimes(1);
        expect(push.mock.invocationCallOrder[0]).toBeLessThan(flash.mock.invocationCallOrder[0]);
        expect(flash).toHaveBeenCalledWith(expect.objectContaining({ undo: expect.objectContaining({ id: "id" }) }));
    });
    it("서버의 저장 확인 후 갱신 실패 안내를 유지하고 이동하지 않는다", async () => {
        remove.mockResolvedValue({ ok: false, error: PATCH_REFRESH_FAILED });
        await render(node); await click(text); await click("휴지통으로 이동");
        expect(host.querySelector('[role="alert"]')?.textContent).toBe(PATCH_REFRESH_FAILED);
        expect(flash).not.toHaveBeenCalled(); expect(push).not.toHaveBeenCalled(); expect(remove).toHaveBeenCalledTimes(1);
    });
    it("이동 전환이 지연되는 동안 삭제 확인창과 공유 잠금을 유지한다", async () => {
        let ready = false; let finish!: () => void;
        const wait = new Promise<void>((resolve) => { finish = () => { ready = true; resolve(); }; });
        function Slow() { if (!ready) throw wait; return <p>이동 완료</p>; }
        function Screen() {
            const [moving, setMoving] = useState(false);
            useEffect(() => { push.mockImplementation(() => setMoving(true)); }, []);
            return <>{node}{moving && <Slow />}</>;
        }
        await render(<Suspense fallback={<p>이동 중</p>}><Screen /></Suspense>);
        try {
            await click(text); await click("휴지통으로 이동");
            expect(isManageMutationPending()).toBe(true); expect(find("취소").disabled).toBe(true); expect(remove).toHaveBeenCalledTimes(1);
        } finally { await act(async () => finish()); }
        expect(isManageMutationPending()).toBe(false);
    });
    it("서버의 결과 불명 안내면 성공 알림·이동·자동 재시도를 하지 않는다", async () => {
        remove.mockResolvedValue({ ok: false, error: UNKNOWN_PATCH_RESULT }); await render(node); await click(text); await click("휴지통으로 이동");
        expect(host.textContent).toContain("이미 반영됐을 수 있으니"); expect(remove).toHaveBeenCalledTimes(1); expect(flash).not.toHaveBeenCalled(); expect(push).not.toHaveBeenCalled();
    });
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
    it("복원 후 refresh 호출 오류는 복원 완료와 구분해 표시하고 성공 알림은 생략한다", async () => {
        refresh.mockImplementationOnce(() => { throw new Error("DO_NOT_ECHO"); });
        await render(<RestoreButton documentId="id" restore={restore} />); await click("복원");
        expect(host.querySelector('[role="alert"]')?.textContent).toContain("복원은 완료됐지만");
        expect(host.textContent).not.toContain("DO_NOT_ECHO"); expect(show).not.toHaveBeenCalled();
        expect(restore).toHaveBeenCalledTimes(1); expect(refresh).toHaveBeenCalledTimes(1); expect(isManageMutationPending()).toBe(false);
    });
    it("refresh 호출 뒤에만 정상 복원 알림을 표시한다", async () => {
        await render(<RestoreButton documentId="id" restore={restore} />); await click("복원");
        expect(show).toHaveBeenCalledWith(expect.objectContaining({ message: "복원했어요. 목록에서 다시 볼 수 있어요." }));
        expect(refresh.mock.invocationCallOrder[0]).toBeLessThan(show.mock.invocationCallOrder[0]);
    });
    it("복원 후 새로고침 전환이 지연돼도 잠금을 유지한다", async () => {
        let ready = false; let finish!: () => void;
        const wait = new Promise<void>((resolve) => { finish = () => { ready = true; resolve(); }; });
        function Slow() { if (!ready) throw wait; return <p>갱신 완료</p>; }
        function Screen() {
            const [moving, setMoving] = useState(false);
            useEffect(() => { refresh.mockImplementation(() => setMoving(true)); }, []);
            return <><RestoreButton documentId="id" restore={restore} />{moving && <Slow />}</>;
        }
        await render(<Suspense fallback={<p>갱신 중</p>}><Screen /></Suspense>);
        try {
            await click("복원"); expect(isManageMutationPending()).toBe(true); expect(host.querySelector("button")?.disabled).toBe(true);
            expect(restore).toHaveBeenCalledTimes(1);
        } finally { await act(async () => finish()); }
        expect(isManageMutationPending()).toBe(false);
    });
    it("서버의 복원 결과 불명 안내를 성공 알림으로 바꾸지 않는다", async () => {
        restore.mockResolvedValue({ ok: false, error: UNKNOWN_PATCH_RESULT }); await render(<RestoreButton documentId="id" restore={restore} />); await click("복원");
        expect(host.textContent).toContain("이미 반영됐을 수 있으니"); expect(restore).toHaveBeenCalledTimes(1); expect(show).not.toHaveBeenCalled(); expect(refresh).not.toHaveBeenCalled();
    });
    it.each([undefined, "", "../bad", "drafts.copy", "versions.release.copy", "bad/path"])("복제 성공 응답의 잘못된 새 ID #%#로 이동하지 않는다", async (newId) => {
        duplicate.mockResolvedValue({ ok: true, newId }); await render(<DuplicateInstructorButton documentId="id" />); await click("복제해서 새로 만들기");
        expect(duplicate).toHaveBeenCalledTimes(1); expect(push).not.toHaveBeenCalled(); expect(host.textContent).toContain("새 탭에서 목록을 확인");
    });
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
