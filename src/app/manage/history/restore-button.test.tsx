// @vitest-environment jsdom
import { act, Suspense, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import RestoreRevisionButton from "./RestoreRevisionButton";
import { isManageMutationPending } from "@/lib/manage-mutation-lock";
import { PATCH_REFRESH_FAILED, UNKNOWN_PATCH_RESULT } from "@/lib/manage-patch-result";

const { restore, flash, push, router } = vi.hoisted(() => {
    const push = vi.fn();
    return { restore: vi.fn(), flash: vi.fn(), push, router: { push } };
});
vi.mock("./actions", () => ({ restoreRevision: restore }));
vi.mock("../_components/Toast", () => ({ flashToast: flash }));
vi.mock("next/navigation", async (importOriginal) => ({ ...await importOriginal<typeof import("next/navigation")>(), useRouter: () => router }));
let root: Root;
let host: HTMLDivElement;
const button = () => host.querySelector("button")!;
async function click() { await act(async () => { button().click(); }); }

beforeEach(async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    vi.resetAllMocks();
    history.replaceState(null, "", "/manage/history/crew/crew-1");
    vi.spyOn(window, "confirm").mockReturnValue(true);
    restore.mockResolvedValue({ ok: true });
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
    await act(async () => { root.render(<RestoreRevisionButton area="crew" documentId="crew-1" time="2026-10-21T12:00:00Z" expectedRevision="current-rev" backHref="/manage/crew/crew-1" />); });
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); });

describe("이력 복원 버튼", () => {
    it("취소하면 복원 요청을 보내지 않는다", async () => {
        vi.mocked(window.confirm).mockReturnValue(false);
        await click();
        expect(restore).not.toHaveBeenCalled();
    });
    it("확인한 현재 버전을 함께 보내고 성공한 경우에만 이동한다", async () => {
        await click();
        expect(restore).toHaveBeenCalledWith("crew", "crew-1", "2026-10-21T12:00:00Z", "current-rev");
        expect(push).toHaveBeenCalledWith("/manage/crew/crew-1");
        expect(flash).toHaveBeenCalledTimes(1);
        expect(push.mock.invocationCallOrder[0]).toBeLessThan(flash.mock.invocationCallOrder[0]);
    });
    it("같은 프레임의 중복 클릭도 한 번만 요청한다", async () => {
        let finish!: (result: { ok: true }) => void;
        restore.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
        await act(async () => { button().click(); button().click(); });
        expect(restore).toHaveBeenCalledTimes(1);
        expect(window.confirm).toHaveBeenCalledTimes(1);
        expect(button().disabled).toBe(true);
        await act(async () => { finish({ ok: true }); });
    });
    it("버전 충돌 응답은 이동하지 않고 안내한다", async () => {
        restore.mockResolvedValue({ ok: false, error: "내용이 바뀌었어요. 새로고침해 주세요." });
        await click();
        expect(host.querySelector('[role="alert"]')!.textContent).toContain("내용이 바뀌었어요");
        expect(push).not.toHaveBeenCalled();
        expect(flash).not.toHaveBeenCalled();
        expect(button().disabled).toBe(false);
    });
    it("통신 예외에도 화면을 유지하고 재확인을 안내한다", async () => {
        restore.mockRejectedValueOnce(new TypeError("Failed to fetch"));
        await click();
        expect(host.querySelector('[role="alert"]')!.textContent).toContain("복원 결과를 확인하지 못했어요");
        expect(push).not.toHaveBeenCalled();
        expect(button().disabled).toBe(false);
        await click();
        expect(restore).toHaveBeenCalledTimes(2);
    });
    it.each([null, undefined, [], {}, { ok: "true" }, { ok: 1 }, { ok: false }, { ok: false, error: 42 }, { ok: false, error: " " }, { ok: false, error: "bad", fields: [null] }, Object.create({ ok: true })].map((value) => ({ value })))("잘못된 응답 #%#는 성공 알림·이동 없이 결과 확인을 안내한다", async ({ value }) => {
        restore.mockResolvedValue(value); await click();
        expect(host.querySelector('[role="alert"]')?.textContent).toContain("복원 결과를 확인하지 못했어요");
        expect(push).not.toHaveBeenCalled(); expect(flash).not.toHaveBeenCalled();
        expect(restore).toHaveBeenCalledTimes(1); expect(button().disabled).toBe(false); expect(isManageMutationPending()).toBe(false);
    });
    it.each([UNKNOWN_PATCH_RESULT, PATCH_REFRESH_FAILED])("서버가 구분한 안내 #%#는 그대로 표시한다", async (error) => {
        restore.mockResolvedValue({ ok: false, error }); await click();
        expect(host.querySelector('[role="alert"]')?.textContent).toBe(error);
        expect(push).not.toHaveBeenCalled(); expect(flash).not.toHaveBeenCalled(); expect(restore).toHaveBeenCalledTimes(1);
    });
    it("복원이 확인된 뒤 이동 호출 오류는 결과 불명과 구분하고 성공 알림을 예약하지 않는다", async () => {
        push.mockImplementationOnce(() => { throw new Error("DO_NOT_ECHO"); }); await click();
        expect(host.querySelector('[role="alert"]')?.textContent).toContain("복원은 완료됐지만");
        expect(host.textContent).not.toContain("DO_NOT_ECHO"); expect(flash).not.toHaveBeenCalled();
        expect(restore).toHaveBeenCalledTimes(1); expect(push).toHaveBeenCalledTimes(1); expect(isManageMutationPending()).toBe(false);
    });
    it("이동 전환이 Suspense로 지연돼도 복원 잠금을 유지한다", async () => {
        let ready = false; let finish!: () => void;
        const wait = new Promise<void>((resolve) => { finish = () => { ready = true; resolve(); }; });
        function Slow() { if (!ready) throw wait; return <p>이동 완료</p>; }
        function Screen() {
            const [moving, setMoving] = useState(false); push.mockImplementation(() => setMoving(true));
            return <><RestoreRevisionButton area="crew" documentId="crew-1" time="2026-10-21T12:00:00Z" expectedRevision="current-rev" backHref="/manage/crew/crew-1" />{moving && <Slow />}</>;
        }
        await act(async () => { root.render(<Suspense fallback={<p>이동 중</p>}><Screen /></Suspense>); });
        try {
            await click(); expect(isManageMutationPending()).toBe(true); expect(button().disabled).toBe(true);
            await click(); expect(restore).toHaveBeenCalledTimes(1);
        } finally { await act(async () => finish()); }
        expect(isManageMutationPending()).toBe(false);
    });
    it.each([{ ok: true }, { ok: false, error: "이전 요청 오류" }])("주소 변경 뒤 늦게 도착한 응답 #%#는 후속 화면 효과를 실행하지 않는다", async (result) => {
        let finish!: (value: typeof result) => void;
        restore.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
        await click(); expect(isManageMutationPending()).toBe(true);
        history.replaceState(null, "", "/manage/other");
        await act(async () => finish(result));
        expect(push).not.toHaveBeenCalled(); expect(flash).not.toHaveBeenCalled();
        expect(host.querySelector('[role="alert"]')).toBeNull(); expect(isManageMutationPending()).toBe(false);
    });
});
