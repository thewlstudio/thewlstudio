// @vitest-environment jsdom
import { act, StrictMode, type ComponentProps, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import GuardedLink from "./GuardedLink";
import UpdatedAt from "./UpdatedAt";
import ManageNav from "../ManageNav";
import { useGuardedForm } from "./useGuardedForm";
import { useManagedFormAction, type ManagedFormSession } from "./useManagedFormAction";
import { isFormDirty, isFormPending, setFormDirty, setFormPending } from "@/lib/formDirtyGuard";
import { listenForManageHistoryLeave } from "./manageHistoryGuard";

const { navigate, save, logout, router } = vi.hoisted(() => ({
    navigate: vi.fn(), save: vi.fn(), logout: vi.fn(), router: { refresh: vi.fn() },
}));
vi.mock("next/navigation", async (original) => ({ ...await original<typeof import("next/navigation")>(), useRouter: () => router }));
vi.mock("../actions", () => ({ logout }));
vi.mock("./tour/TourButton", () => ({ default: () => null }));
vi.mock("next/link", () => ({
    // Next의 공개 onNavigate 계약을 모사한다. 실제 라우터 탐색은 수행하지 않는다.
    default: ({ href, onNavigate, onClick, children, ...props }: ComponentProps<typeof import("next/link").default>) => <a
        {...props} href={String(href)} onClick={(e) => {
            onClick?.(e);
            if (e.defaultPrevented) return;
            e.preventDefault(); // jsdom의 실제 문서 탐색은 막는다
            if (e.button !== 0 || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey ||
                (props.target && props.target !== "_self") || props.download !== undefined ||
                new URL(String(href), location.href).origin !== location.origin) return;
            let prevented = false;
            onNavigate?.({ preventDefault: () => { prevented = true; } });
            if (!prevented) navigate(href);
        }}
    >{children}</a>,
}));

type Result = { ok: true } | { ok: false; error: string };
function Editor({ session }: { session: ManagedFormSession }) {
    const guard = useGuardedForm(session.state, session.formAction, session.isPending);
    return <>
        <form data-manage-form noValidate onSubmit={guard.validateOnSubmit} onChange={guard.markDirty}>
            <fieldset disabled={session.isPending}>
                <input id="name" name="name" defaultValue="기존 값" />
                <button>저장</button>
                <button type="button" onClick={session.onDiscard}>변경 버리기</button>
            </fieldset>
        </form>
        <button type="button" onClick={() => { guard.markDirty(); document.querySelector<HTMLAnchorElement>('[data-exit]')!.click(); }}>즉시 이동</button>
    </>;
}
function Harness({ revision = "v1" }: { revision?: string }) {
    const session = useManagedFormAction(save, revision);
    return <>
        <ManageNav title="수정 화면" />
        <UpdatedAt iso="2026-10-25T01:00:00Z" historyHref="/manage/history/crew/crew-1" />
        <Editor key={session.formKey} session={session} />
        <GuardedLink data-exit href="/manage/crew">목록</GuardedLink>
    </>;
}

let root: Root;
let host: HTMLDivElement;
const button = (text: string) => Array.from(host.querySelectorAll("button")).find((el) => el.textContent === text)!;
const link = (text: string) => Array.from(host.querySelectorAll("a")).find((el) => el.textContent?.trim() === text)!;
async function render(node: ReactNode = <Harness />) { await act(async () => root.render(node)); }
async function clickLink(text: string, options: MouseEventInit = {}) {
    await act(async () => link(text).dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, ...options })));
}
async function edit() {
    await act(async () => {
        const el = host.querySelector<HTMLInputElement>("#name")!;
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(el, "수정 값");
        el.dispatchEvent(new Event("input", { bubbles: true }));
    });
}
async function submit() { await act(async () => host.querySelector<HTMLFormElement>("form[data-manage-form]")!.requestSubmit()); }
function historyEvent(overrides: { cancelable?: boolean; navigationType?: string; sameDocument?: boolean; url?: string } = {}) {
    const e = new Event("navigate", { cancelable: overrides.cancelable ?? true });
    Object.assign(e, {
        navigationType: overrides.navigationType ?? "traverse",
        destination: { sameDocument: overrides.sameDocument ?? true, url: overrides.url ?? location.origin + "/manage/crew" },
    });
    return e;
}

beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    vi.clearAllMocks();
    setFormDirty(false);
    setFormPending(false);
    save.mockResolvedValue({ ok: false, error: "저장 실패" });
    logout.mockResolvedValue(undefined);
    vi.spyOn(window, "confirm").mockReturnValue(false);
    vi.spyOn(window, "alert").mockImplementation(() => {});
    HTMLElement.prototype.scrollIntoView = vi.fn();
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
});
afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    setFormDirty(false);
    setFormPending(false);
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe("관리 링크·로그아웃 보호", () => {
    it.each(["← 관리 허브", "사용 안내", "변경 이력 보기", "목록"])("%s — 미저장 이동 취소 시 입력을 유지한다", async (text) => {
        await render();
        await edit();
        await clickLink(text);
        expect(window.confirm).toHaveBeenCalledTimes(1);
        expect(navigate).not.toHaveBeenCalled();
        expect(host.querySelector<HTMLInputElement>("#name")?.value).toBe("수정 값");
        expect(isFormDirty()).toBe(true);
    });
    it("이동 승인만으로 dirty를 지우지 않는다 (탐색 실패 시에도 보호 유지)", async () => {
        vi.mocked(window.confirm).mockReturnValue(true);
        await render();
        await edit();
        await clickLink("변경 이력 보기");
        expect(navigate).toHaveBeenCalledWith("/manage/history/crew/crew-1");
        expect(isFormDirty()).toBe(true);
    });
    it("수정하지 않았으면 확인 없이 이동한다", async () => {
        await render();
        await clickLink("변경 이력 보기");
        expect(window.confirm).not.toHaveBeenCalled();
        expect(navigate).toHaveBeenCalledTimes(1);
    });
    it("같은 화면의 해시 이동은 미저장 내용이 있어도 막지 않는다", async () => {
        await render(<GuardedLink href="#details">해시 이동</GuardedLink>);
        setFormDirty(true);
        await clickLink("해시 이동");
        expect(window.confirm).not.toHaveBeenCalled();
        expect(navigate).toHaveBeenCalledWith("#details");
    });
    it.each([{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }])("보조 클릭 %j는 현재 폼을 떠나지 않아 확인하지 않는다", async (options) => {
        await render();
        await edit();
        await clickLink("목록", options);
        expect(window.confirm).not.toHaveBeenCalled();
        expect(navigate).not.toHaveBeenCalled();
        expect(isFormDirty()).toBe(true);
    });
    it.each([
        <GuardedLink key="tab" href="/manage/help" target="_blank">열기</GuardedLink>,
        <GuardedLink key="download" href="/photo.jpg" download>열기</GuardedLink>,
        <GuardedLink key="external" href="https://example.com">열기</GuardedLink>,
    ])("새 탭·다운로드·외부 링크는 Next 탐색 확인을 호출하지 않는다", async (node) => {
        await render(node);
        setFormDirty(true);
        await clickLink("열기");
        expect(window.confirm).not.toHaveBeenCalled();
        expect(navigate).not.toHaveBeenCalled();
    });
    it("같은 이벤트에서 편집 후 바로 이동해도 미저장 상태를 놓치지 않는다", async () => {
        await render();
        await act(async () => button("즉시 이동").click());
        expect(window.confirm).toHaveBeenCalledTimes(1);
        expect(navigate).not.toHaveBeenCalled();
    });
    it("로그아웃 취소 시 액션을 호출하지 않고, 승인 후에만 호출한다", async () => {
        await render();
        await edit();
        await act(async () => button("로그아웃").click());
        expect(logout).not.toHaveBeenCalled();
        vi.mocked(window.confirm).mockReturnValue(true);
        await act(async () => button("로그아웃").click());
        expect(logout).toHaveBeenCalledTimes(1);
    });
    it.each([false, true])("저장 중(dirty=%s)에는 이동·로그아웃을 막고 실패 후에는 다시 확인한다", async (dirty) => {
        let finish!: (result: Result) => void;
        save.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
        await render();
        if (dirty) await edit();
        await submit();
        expect(isFormPending()).toBe(true);
        await clickLink("← 관리 허브");
        await clickLink("변경 이력 보기");
        await act(async () => button("로그아웃").click());
        expect(button("로그아웃").disabled).toBe(true);
        expect(window.alert).toHaveBeenCalledTimes(2);
        expect(window.confirm).not.toHaveBeenCalled();
        expect(navigate).not.toHaveBeenCalled();
        expect(logout).not.toHaveBeenCalled();
        await act(async () => finish({ ok: false, error: "저장 실패" }));
        expect(isFormPending()).toBe(false);
        await clickLink("목록");
        expect(window.confirm).toHaveBeenCalledTimes(dirty ? 1 : 0);
    });
    it("저장 성공 또는 변경 버리기 뒤에는 불필요한 경고를 남기지 않는다", async () => {
        save.mockResolvedValue({ ok: true });
        await render();
        await edit();
        await submit();
        expect(isFormDirty()).toBe(false);
        expect(isFormPending()).toBe(false);
        await clickLink("목록");
        expect(window.confirm).not.toHaveBeenCalled();
        await edit();
        await act(async () => button("변경 버리기").click());
        expect(isFormDirty()).toBe(false);
        await clickLink("사용 안내");
        expect(window.confirm).not.toHaveBeenCalled();
    });
    it("beforeunload는 dirty 또는 저장 중일 때만 취소한다", async () => {
        await render();
        const clean = new Event("beforeunload", { cancelable: true });
        window.dispatchEvent(clean);
        expect(clean.defaultPrevented).toBe(false);
        await edit();
        const dirty = new Event("beforeunload", { cancelable: true });
        window.dispatchEvent(dirty);
        expect(dirty.defaultPrevented).toBe(true);
        await act(async () => button("변경 버리기").click());
        setFormPending(true);
        const pending = new Event("beforeunload", { cancelable: true });
        window.dispatchEvent(pending);
        expect(pending.defaultPrevented).toBe(true);
    });
});

describe("브라우저 뒤로·앞으로 이동의 선택적 보호", () => {
    it("취소 가능한 동일 문서 탐색에서만 확인하고 취소·승인을 반영한다", async () => {
        const navigation = new EventTarget();
        vi.stubGlobal("navigation", navigation);
        await render(<StrictMode><Harness /></StrictMode>);
        await edit();
        const cancelled = historyEvent();
        navigation.dispatchEvent(cancelled);
        expect(cancelled.defaultPrevented).toBe(true);
        expect(window.confirm).toHaveBeenCalledTimes(1);
        vi.mocked(window.confirm).mockReturnValue(true);
        const allowed = historyEvent();
        navigation.dispatchEvent(allowed);
        expect(allowed.defaultPrevented).toBe(false);
        await render(<p>다른 화면</p>);
        expect(isFormDirty()).toBe(false);
        expect(isFormPending()).toBe(false);
        navigation.dispatchEvent(historyEvent());
        expect(window.confirm).toHaveBeenCalledTimes(2); // 해제된 리스너는 다시 묻지 않는다
    });
    it.each([
        { cancelable: false }, { sameDocument: false }, { navigationType: "push" },
        { navigationType: "replace" }, { navigationType: "reload" },
        { url: location.href + "#name" },
    ])("차단 범위가 아닌 탐색 %j는 가로채지 않는다", (options) => {
        const navigation = new EventTarget();
        vi.stubGlobal("navigation", navigation);
        const cleanup = listenForManageHistoryLeave();
        try {
            setFormDirty(true);
            const e = historyEvent(options);
            navigation.dispatchEvent(e);
            expect(window.confirm).not.toHaveBeenCalled();
            expect(e.defaultPrevented).toBe(false);
        } finally { cleanup(); }
    });
    it("이미 취소된 탐색과 clean 폼에서는 다시 확인하지 않는다", () => {
        const navigation = new EventTarget();
        vi.stubGlobal("navigation", navigation);
        const cleanup = listenForManageHistoryLeave();
        try {
            navigation.dispatchEvent(historyEvent());
            setFormDirty(true);
            const e = historyEvent();
            e.preventDefault();
            navigation.dispatchEvent(e);
            expect(window.confirm).not.toHaveBeenCalled();
        } finally { cleanup(); }
    });
    it("저장 중 뒤로 가기는 확인 승인으로도 통과시키지 않는다", () => {
        const navigation = new EventTarget();
        vi.stubGlobal("navigation", navigation);
        const cleanup = listenForManageHistoryLeave();
        try {
            setFormPending(true);
            vi.mocked(window.confirm).mockReturnValue(true);
            const e = historyEvent();
            navigation.dispatchEvent(e);
            expect(e.defaultPrevented).toBe(true);
            expect(window.confirm).not.toHaveBeenCalled();
            expect(window.alert).toHaveBeenCalledTimes(1);
        } finally { cleanup(); }
    });
    it("미지원 환경에서는 기존 History API를 패치하거나 가짜 기록을 넣지 않는다", () => {
        vi.stubGlobal("navigation", undefined);
        const push = vi.spyOn(history, "pushState"), replace = vi.spyOn(history, "replaceState");
        expect(listenForManageHistoryLeave()).toBeTypeOf("function");
        expect(push).not.toHaveBeenCalled();
        expect(replace).not.toHaveBeenCalled();
    });
});
