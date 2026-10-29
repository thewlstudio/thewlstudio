// @vitest-environment jsdom
import { act, StrictMode, Suspense, useState, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import WorkForm, { type WorkFormData } from "../works/[id]/WorkForm";
import DeleteWorkButton from "../works/[id]/DeleteWorkButton";
import DuplicateInstructorButton from "../instructors/[id]/DuplicateInstructorButton";
import RestoreButton from "./RestoreButton";
import ReorderButtons from "./ReorderButtons";
import ManagedList from "./ManagedList";
import RestoreRevisionButton from "../history/RestoreRevisionButton";
import ManageNav from "../ManageNav";
import { ToastProvider, flashToast } from "./Toast";
import { useManageMutation } from "./useManageMutation";
import { acquireManageMutation, isManageMutationPending, releaseManageMutation } from "@/lib/manage-mutation-lock";

const { save, remove, duplicate, restore, move, logout, revision, push, refresh, sideEffect, router } = vi.hoisted(() => {
    const push = vi.fn(), refresh = vi.fn();
    return { save: vi.fn(), remove: vi.fn(), duplicate: vi.fn(), restore: vi.fn(), move: vi.fn(), logout: vi.fn(), revision: vi.fn(), push, refresh, sideEffect: vi.fn(), router: { push, refresh } };
});
vi.mock("next/navigation", async (original) => ({ ...await original<typeof import("next/navigation")>(), useRouter: () => router, usePathname: () => "/manage/works/work-1" }));
vi.mock("next/link", () => ({ default: ({ children, onNavigate, ...props }: { children: ReactNode; onNavigate?: unknown }) => {
    void onNavigate;
    return <a {...props}>{children}</a>;
} }));
vi.mock("../works/actions", () => ({ saveWork: save, createWork: save, deleteWork: remove, restoreWork: restore }));
vi.mock("../instructors/actions", () => ({ duplicateInstructor: duplicate, restoreInstructor: restore }));
vi.mock("../crew/actions", () => ({ restoreCrew: restore }));
vi.mock("../studio/actions", () => ({ restoreSpace: restore }));
vi.mock("../actions", () => ({ logout }));
vi.mock("../history/actions", () => ({ restoreRevision: revision }));
vi.mock("./tour/TourButton", () => ({ default: () => null }));
vi.mock("./ImageCropper", () => ({ default: () => null }));

type Result = { ok: true; newId?: string } | { ok: false; error: string };
const unfinished = new Set<(result: Result) => void>();
function deferred() {
    let resolve!: (result: Result) => void;
    const promise = new Promise<Result>((yes) => { resolve = (result) => { unfinished.delete(resolve); yes(result); }; });
    unfinished.add(resolve);
    return { promise, resolve };
}
const work: WorkFormData = {
    _id: "work-1", _rev: "v1", title: "기존 작품", artist: "아티스트", slug: "album", releaseDate: "2026-10-26",
    imageUrl: null, youtubeUrl: "", instagramId: "", instagramUrl: "", blocks: [],
};
let root: Root;
let host: HTMLDivElement;
function Controls() {
    return <>
        <DeleteWorkButton documentId="work-1" workTitle="작품" />
        <DuplicateInstructorButton documentId="instructor-1" />
        <RestoreButton documentId="trash-1" restore={restore} />
        <RestoreRevisionButton area="works" documentId="work-1" time="2026-10-25T00:00:00Z" expectedRevision="v1" backHref="/manage/works/work-1" />
    </>;
}
const form = () => host.querySelector<HTMLFormElement>("form[data-manage-form]")!;
const button = (text: string) => Array.from(host.querySelectorAll("button")).find((el) => el.textContent === text)!;
async function render(node: ReactNode) { await act(async () => root.render(node)); }
async function click(text: string) { await act(async () => button(text).click()); }
async function edit() {
    await act(async () => {
        const el = host.querySelector<HTMLInputElement>("#title")!;
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(el, "미저장 제목");
        el.dispatchEvent(new Event("input", { bubbles: true }));
    });
}
function title() { return host.querySelector<HTMLInputElement>("#title")!; }

beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    vi.clearAllMocks();
    save.mockResolvedValue({ ok: false, error: "저장 실패" });
    remove.mockResolvedValue({ ok: false, error: "삭제 실패" });
    duplicate.mockResolvedValue({ ok: false, error: "복제 실패" });
    restore.mockResolvedValue({ ok: true });
    move.mockResolvedValue({ ok: true });
    revision.mockResolvedValue({ ok: true });
    logout.mockResolvedValue(undefined);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.spyOn(window, "alert").mockImplementation(() => {});
    HTMLElement.prototype.scrollIntoView = vi.fn();
    sessionStorage.clear();
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
});
afterEach(async () => {
    // 중간 단언이 실패하더라도, 실제로 전송됐다고 모사한 요청은 정착시킨다.
    await act(async () => {
        for (const finish of [...unfinished]) finish({ ok: false, error: "테스트 정리" });
    });
    await act(async () => root.unmount());
    host.remove();
    history.replaceState(null, "", "/");
    sessionStorage.clear();
    vi.restoreAllMocks();
});

describe("실제 관리 컴포넌트 사이의 상호 배제", () => {
    it.each(["복원", "되돌리기"])("미저장 편집이 있을 때 %s 취소는 입력과 알림을 보존한다", async (action) => {
        flashToast({ message: "삭제한 항목", undo: { area: "works", id: "trash" } });
        await render(<ToastProvider><WorkForm data={work} /><RestoreButton documentId="trash" restore={restore} /></ToastProvider>);
        await edit();
        vi.mocked(window.confirm).mockReturnValue(false);
        await click(action);
        expect(restore).not.toHaveBeenCalled();
        expect(title().value).toBe("미저장 제목");
        expect(host.textContent).toContain("삭제한 항목");
        expect(refresh).not.toHaveBeenCalled();
        expect(isManageMutationPending()).toBe(false);
    });
    it("저장 직후 같은 프레임의 삭제·복제·복원·이력 복원도 실행하지 않는다", async () => {
        const pending = deferred();
        save.mockReturnValue(pending.promise);
        await render(<><WorkForm data={work} /><Controls /></>);
        const controls = ["이 작품 삭제하기", "복제해서 새로 만들기", "복원", "이 시점으로 되돌리기"].map(button);
        await act(async () => { form().requestSubmit(); controls.forEach((el) => el.click()); });
        expect(save).toHaveBeenCalledTimes(1);
        expect(remove).not.toHaveBeenCalled();
        expect(duplicate).not.toHaveBeenCalled();
        expect(restore).not.toHaveBeenCalled();
        expect(revision).not.toHaveBeenCalled();
        expect(host.querySelector('[role="alertdialog"]')).toBeNull();
        expect(controls.every((el) => el.disabled)).toBe(true);
        await act(async () => pending.resolve({ ok: false, error: "저장 실패" }));
        expect(controls.every((el) => !el.disabled)).toBe(true);
    });
    it("삭제 중 저장·편집을 막고 삭제 실패 후 기존 입력을 유지한다", async () => {
        const pending = deferred();
        remove.mockReturnValue(pending.promise);
        await render(<><WorkForm data={work} /><Controls /></>);
        await edit();
        await click("이 작품 삭제하기");
        await act(async () => { button("휴지통으로 이동").click(); form().requestSubmit(); });
        expect(remove).toHaveBeenCalledTimes(1);
        expect(save).not.toHaveBeenCalled();
        expect(title().matches(":disabled")).toBe(true);
        expect(button("변경 버리기").matches(":disabled")).toBe(true);
        await act(async () => pending.resolve({ ok: false, error: "삭제 실패" }));
        expect(title().value).toBe("미저장 제목");
        expect(title().matches(":disabled")).toBe(false);
        await act(async () => form().requestSubmit());
        expect(save).toHaveBeenCalledTimes(1);
    });
    it("복제 중 입력·저장을 막고 실패하면 편집과 다른 작업을 다시 허용한다", async () => {
        const pending = deferred();
        duplicate.mockReturnValue(pending.promise);
        await render(<><WorkForm data={work} /><Controls /></>);
        await edit();
        await act(async () => { button("복제해서 새로 만들기").click(); form().requestSubmit(); button("복원").click(); });
        expect(duplicate).toHaveBeenCalledTimes(1);
        expect(save).not.toHaveBeenCalled();
        expect(restore).not.toHaveBeenCalled();
        expect(title().matches(":disabled")).toBe(true);
        await act(async () => pending.resolve({ ok: false, error: "복제 실패" }));
        expect(title().value).toBe("미저장 제목");
        expect(title().matches(":disabled")).toBe(false);
        expect(push).not.toHaveBeenCalled();
        await click("복원");
        expect(restore).toHaveBeenCalledTimes(1);
    });
    it("복원과 목록 순서 변경은 서로를 잠그며, 잠금 때문에 누른 작업은 대기열에 넣지 않는다", async () => {
        const restoring = deferred(), moving = deferred();
        restore.mockReturnValue(restoring.promise);
        move.mockReturnValue(moving.promise);
        await render(<ManagedList minItemsForTools={99} searchPlaceholder="찾기" items={[
            { id: "one", search: "one", node: <><RestoreButton documentId="trash" restore={restore} /><ReorderButtons documentId="one" disableUp={false} disableDown={false} move={move} /></> },
        ]} />);
        const down = host.querySelector<HTMLButtonElement>('[aria-label="아래로 이동"]')!;
        await act(async () => { button("복원").click(); down.click(); });
        expect(restore).toHaveBeenCalledTimes(1);
        expect(move).not.toHaveBeenCalled();
        expect(down.disabled).toBe(true);
        await act(async () => restoring.resolve({ ok: false, error: "복원 실패" }));
        expect(move).not.toHaveBeenCalled();
        await act(async () => { down.click(); button("복원").click(); });
        expect(move).toHaveBeenCalledTimes(1);
        expect(restore).toHaveBeenCalledTimes(1);
        await act(async () => moving.resolve({ ok: true }));
        expect(isManageMutationPending()).toBe(false);
    });
    it("다른 작업 중에는 알림 되돌리기를 소비하지 않고 완료 뒤 실행할 수 있다", async () => {
        const pending = deferred();
        save.mockReturnValue(pending.promise);
        flashToast({ message: "삭제한 항목", undo: { area: "works", id: "trash" } });
        await render(<ToastProvider><WorkForm data={work} /></ToastProvider>);
        await act(async () => { form().requestSubmit(); button("되돌리기").click(); });
        expect(restore).not.toHaveBeenCalled();
        expect(host.textContent).toContain("삭제한 항목");
        expect(button("되돌리기").disabled).toBe(true);
        await act(async () => pending.resolve({ ok: false, error: "저장 실패" }));
        await click("되돌리기");
        expect(restore).toHaveBeenCalledWith("trash");
    });
    it("로그아웃 중 저장을 막고 전송 실패 시 편집 내용과 화면을 보존한다", async () => {
        let fail!: (error: Error) => void;
        logout.mockReturnValue(new Promise((_, reject) => { fail = reject; }));
        await render(<><ManageNav title="수정" /><WorkForm data={work} /><Controls /></>);
        await edit();
        try {
            await act(async () => { button("로그아웃").click(); form().requestSubmit(); });
            expect(logout).toHaveBeenCalledTimes(1);
            expect(save).not.toHaveBeenCalled();
            expect(title().matches(":disabled")).toBe(true);
        } finally {
            await act(async () => fail(new TypeError("offline")));
        }
        expect(host.textContent).toContain("처리 결과를 확인하지 못했어요");
        expect(title().value).toBe("미저장 제목");
        expect(title().matches(":disabled")).toBe(false);
        expect(isManageMutationPending()).toBe(false);
    });
});

function Owner({ task }: { task: () => Promise<Result> }) {
    const mutation = useManageMutation();
    return <button disabled={mutation.isBusy} onClick={() => mutation.run(async (isCurrent) => {
        await task();
        if (isCurrent()) sideEffect();
    })}>소유자 작업</button>;
}

describe("잠금 수명과 늦은 응답", () => {
    it.each(["성공", "실패"])("화면을 떠난 뒤 삭제 %s가 와도 이전 목록으로 이동하거나 알림을 예약하지 않는다", async (result) => {
        const pending = deferred();
        remove.mockReturnValue(pending.promise);
        await render(<DeleteWorkButton documentId="work-1" workTitle="작품" />);
        await click("이 작품 삭제하기");
        await click("휴지통으로 이동");
        await render(<Owner task={move} />);
        expect(isManageMutationPending()).toBe(true);
        expect(button("소유자 작업").disabled).toBe(true);
        await act(async () => pending.resolve(result === "성공" ? { ok: true } : { ok: false, error: "늦은 실패" }));
        expect(push).not.toHaveBeenCalled();
        expect(sessionStorage.getItem("wls_manage_flash")).toBeNull();
        expect(isManageMutationPending()).toBe(false);
        await click("소유자 작업");
        expect(move).toHaveBeenCalledTimes(1);
    });
    it("이전 폼의 저장 응답도 새 화면을 새로고침하지 않는다", async () => {
        const pending = deferred();
        save.mockReturnValue(pending.promise);
        await render(<WorkForm data={work} />);
        await act(async () => form().requestSubmit());
        await render(<Owner task={move} />);
        expect(isManageMutationPending()).toBe(true);
        await act(async () => pending.resolve({ ok: true }));
        expect(refresh).not.toHaveBeenCalled();
        expect(isManageMutationPending()).toBe(false);
    });
    it.each(["복제", "이력 복원", "알림 복원"])("화면을 떠난 뒤 %s 응답은 이전 화면의 후속 탐색을 실행하지 않는다", async (action) => {
        const pending = deferred();
        if (action === "복제") {
            duplicate.mockReturnValue(pending.promise);
            await render(<DuplicateInstructorButton documentId="instructor-1" />);
            await click("복제해서 새로 만들기");
        } else if (action === "이력 복원") {
            revision.mockReturnValue(pending.promise);
            await render(<RestoreRevisionButton area="works" documentId="work-1" time="2026-10-25T00:00:00Z" expectedRevision="v1" backHref="/manage/works/work-1" />);
            await click("이 시점으로 되돌리기");
        } else {
            restore.mockReturnValue(pending.promise);
            flashToast({ message: "삭제한 항목", undo: { area: "works", id: "trash" } });
            await render(<ToastProvider><p>이전 화면</p></ToastProvider>);
            await click("되돌리기");
        }
        await render(<Owner task={move} />);
        expect(isManageMutationPending()).toBe(true);
        await act(async () => pending.resolve({ ok: true, newId: "copy-1" }));
        expect(push).not.toHaveBeenCalled();
        expect(refresh).not.toHaveBeenCalled();
        expect(sessionStorage.getItem("wls_manage_flash")).toBeNull();
        expect(isManageMutationPending()).toBe(false);
    });
    it("컴포넌트가 유지돼도 주소가 달라진 뒤에는 이전 작업의 화면 후속 효과를 실행하지 않는다", async () => {
        const pending = deferred();
        await render(<Owner task={() => pending.promise} />);
        await click("소유자 작업");
        history.replaceState(null, "", "/manage/other");
        await act(async () => pending.resolve({ ok: true }));
        expect(sideEffect).not.toHaveBeenCalled();
        expect(isManageMutationPending()).toBe(false);
    });
    it("StrictMode에서도 완료·해제 뒤 잠금이 남지 않고 반복 실행할 수 있다", async () => {
        await render(<StrictMode><Owner task={move} /></StrictMode>);
        await click("소유자 작업");
        await click("소유자 작업");
        expect(move).toHaveBeenCalledTimes(2);
        expect(isManageMutationPending()).toBe(false);
    });
    it("새로고침 전환이 Suspense로 대기하는 동안 다른 쓰기 잠금을 유지한다", async () => {
        let finishRender!: () => void;
        let ready = false;
        const wait = new Promise<void>((resolve) => { finishRender = () => { ready = true; resolve(); }; });
        function Slow() { if (!ready) throw wait; return <p>최신 화면</p>; }
        function Refreshing() {
            const mutation = useManageMutation();
            const [slow, setSlow] = useState(false);
            return <>
                <button disabled={mutation.isBusy} onClick={() => mutation.run(async () => {
                    await move();
                    mutation.startTransition(() => setSlow(true));
                })}>새로고침 작업</button>
                {slow && <Slow />}
            </>;
        }
        await render(<Suspense fallback={<p>대기 중</p>}><Refreshing /><Owner task={restore} /></Suspense>);
        try {
            await click("새로고침 작업");
            expect(isManageMutationPending()).toBe(true);
            expect(button("소유자 작업").disabled).toBe(true);
            await click("소유자 작업");
            expect(restore).not.toHaveBeenCalled();
        } finally { await act(async () => finishRender()); }
        expect(isManageMutationPending()).toBe(false);
    });
    it("실제 폼의 저장 성공과 서버 화면 갱신 사이에도 잠금 공백이 없다", async () => {
        let finishRender!: () => void;
        let ready = false;
        const wait = new Promise<void>((resolve) => { finishRender = () => { ready = true; resolve(); }; });
        function Slow() { if (!ready) throw wait; return <p>갱신 완료</p>; }
        function Page() {
            const [slow, setSlow] = useState(false);
            refresh.mockImplementation(() => setSlow(true));
            return <Suspense fallback={<p>갱신 대기</p>}><WorkForm data={work} /><Controls />{slow && <Slow />}</Suspense>;
        }
        save.mockResolvedValue({ ok: true });
        await render(<Page />);
        try {
            await act(async () => form().requestSubmit());
            expect(refresh).toHaveBeenCalledTimes(1);
            expect(isManageMutationPending()).toBe(true);
            expect(button("이 작품 삭제하기").disabled).toBe(true);
            expect(title().matches(":disabled")).toBe(true);
        } finally { await act(async () => finishRender()); }
        expect(isManageMutationPending()).toBe(false);
        refresh.mockReset();
    });
    it("소유자가 아닌 토큰의 해제는 다른 작업의 잠금을 풀지 못한다", () => {
        const token = acquireManageMutation()!;
        try {
            expect(acquireManageMutation()).toBeNull();
            releaseManageMutation(Symbol("wrong-owner"));
            expect(isManageMutationPending()).toBe(true);
        } finally { releaseManageMutation(token); }
        expect(isManageMutationPending()).toBe(false);
    });
});
