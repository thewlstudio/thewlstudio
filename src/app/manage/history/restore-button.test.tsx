// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import RestoreRevisionButton from "./RestoreRevisionButton";

const { restore, flash, push, router } = vi.hoisted(() => {
    const push = vi.fn();
    return { restore: vi.fn(), flash: vi.fn(), push, router: { push } };
});
vi.mock("./actions", () => ({ restoreRevision: restore }));
vi.mock("../_components/Toast", () => ({ flashToast: flash }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
let root: Root;
let host: HTMLDivElement;
const button = () => host.querySelector("button")!;
async function click() { await act(async () => { button().click(); }); }

beforeEach(async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    vi.resetAllMocks();
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
});
