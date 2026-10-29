// @vitest-environment jsdom
import { act, StrictMode, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CropButton from "./ImageCropper";
import { useImageInput } from "./useImageInput";
import { useGuardedForm } from "./useGuardedForm";

let root: Root;
let host: HTMLDivElement;
let chosen: File[];
const save = vi.fn();
function Harness({ currentUrl = null }: { currentUrl?: string | null }) {
    const image = useImageInput();
    const guard = useGuardedForm(null, save, false);
    return <form data-manage-form onSubmit={guard.validateOnSubmit} onChange={guard.markDirty}>
        <input id="photo" type="file" onChange={image.onChange} />
        <CropButton inputId="photo" currentUrl={currentUrl} defaultRatio={1} />
        <button type="submit">저장</button>
        {image.preview && <span data-preview>{image.preview}</span>}
    </form>;
}
async function render(node: ReactNode = <Harness />) { await act(async () => root.render(node)); }
function input() { return host.querySelector<HTMLInputElement>("input")!; }
function button(text: string, scope: ParentNode = document) {
    return Array.from(scope.querySelectorAll("button")).find((el) => el.textContent === text)!;
}
const dialog = () => document.querySelector<HTMLElement>('[role="dialog"]');
async function click(text: string) { await act(async () => button(text).click()); }
async function key(key: string, extra: KeyboardEventInit = {}) {
    await act(async () => document.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...extra })));
}
function installInput() {
    chosen = [];
    Object.defineProperty(input(), "files", { configurable: true, get: () => chosen, set: (files: File[]) => { chosen = files; } });
    Object.defineProperty(input(), "value", { configurable: true, get: () => chosen[0]?.name ?? "", set: (value: string) => { if (!value) chosen = []; } });
}
async function open() {
    chosen = [new File(["original"], "portrait.jpg", { type: "image/jpeg" })];
    button("사진 자르기").focus();
    await click("사진 자르기");
}
async function loadImage(w = 800, h = 600) {
    const img = dialog()!.querySelector("img")!;
    Object.defineProperties(img, { naturalWidth: { value: w }, naturalHeight: { value: h } });
    await act(async () => img.dispatchEvent(new Event("load")));
}
function canvas(encode: (cb: BlobCallback) => void = (cb) => cb(new Blob(["cropped"], { type: "image/jpeg" }))) {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ fillRect: vi.fn(), drawImage: vi.fn() } as unknown as CanvasRenderingContext2D);
    return vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(encode);
}

beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    vi.clearAllMocks();
    vi.stubGlobal("DataTransfer", class {
        files: File[] = [];
        items = { add: (file: File) => this.files.push(file) };
    });
    URL.createObjectURL = vi.fn((blob: Blob) => `blob:${(blob as File).name ?? "remote"}`);
    URL.revokeObjectURL = vi.fn();
    HTMLElement.prototype.scrollIntoView = vi.fn();
    vi.spyOn(window, "alert").mockImplementation(() => {});
    document.body.style.overflow = "clip";
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
});
afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    document.body.style.overflow = "";
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe("관리 사진 자르기", () => {
    it("배경·스크롤을 잠그고 Tab을 가두며 Escape 후 원래 포커스·잠금을 복원한다", async () => {
        await render(<StrictMode><Harness /></StrictMode>);
        installInput();
        await open();
        expect(host.hasAttribute("inert")).toBe(true);
        expect(input().dataset.imageCropping).toBe("true");
        expect(document.body.style.overflow).toBe("hidden");
        expect(document.activeElement).toBe(dialog());
        await key("Tab");
        expect(document.activeElement).toBe(button("자유"));
        button("취소").focus();
        await key("Tab");
        expect(document.activeElement).toBe(button("자유")); // 적용 버튼은 아직 disabled
        button("자유").focus();
        await key("Tab", { shiftKey: true });
        expect(document.activeElement).toBe(button("취소"));
        input().focus(); // 브라우저 inert를 구현하지 않는 jsdom에서도 focusin 방어 확인
        expect(document.activeElement).toBe(dialog());
        await key("s", { ctrlKey: true });
        expect(save).not.toHaveBeenCalled();
        await key("Escape");
        expect(dialog()).toBeNull();
        expect(host.hasAttribute("inert")).toBe(false);
        expect(input().dataset.imageCropping).toBeUndefined();
        expect(document.body.style.overflow).toBe("clip");
        expect(document.activeElement).toBe(button("사진 자르기"));
    });
    it("기존 inert 속성은 취소 후에도 보존한다", async () => {
        const background = document.createElement("aside");
        background.setAttribute("inert", "existing");
        document.body.append(background);
        try {
            await render();
            installInput();
            await open();
            await click("취소");
            expect(background.getAttribute("inert")).toBe("existing");
        } finally { background.remove(); }
    });
    it("작은 사진의 자유 비율 모서리를 움직여도 원본 영역 밖을 자르지 않는다", async () => {
        canvas();
        await render();
        installInput();
        await open();
        await loadImage(10, 8);
        await click("자유");
        const stage = dialog()!.querySelector<HTMLElement>('[aria-label^="자를 영역"]')!;
        const handle = stage.querySelector<HTMLElement>("span")!;
        Object.defineProperty(handle, "setPointerCapture", { value: vi.fn() });
        await act(async () => handle.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, clientX: 1, clientY: 1 })));
        await act(async () => stage.dispatchEvent(new MouseEvent("pointermove", { bubbles: true, clientX: 0, clientY: 0 })));
        await click("이 영역으로 자르기");
        const ctx = vi.mocked(HTMLCanvasElement.prototype.getContext).mock.results[0].value as CanvasRenderingContext2D;
        const [, sx, sy, sw, sh] = vi.mocked(ctx.drawImage).mock.calls[0] as unknown as [HTMLImageElement, number, number, number, number];
        expect(sx).toBeGreaterThanOrEqual(0);
        expect(sy).toBeGreaterThanOrEqual(0);
        expect(sx + sw).toBeLessThanOrEqual(10);
        expect(sy + sh).toBeLessThanOrEqual(8);
    });
    it("자르기 결과와 파일 입력·미리보기가 일치하고 정상 종료 후 포커스를 돌려준다", async () => {
        canvas();
        await render();
        installInput();
        await open();
        await loadImage();
        await click("이 영역으로 자르기");
        expect(dialog()).toBeNull();
        expect(input().files?.[0].name).toBe("portrait-crop.jpg");
        expect(host.querySelector("[data-preview]")?.textContent).toBe("blob:portrait-crop.jpg");
        expect(input().dataset.imageProcessing).toBeUndefined();
        expect(input().dataset.imageCropping).toBeUndefined();
        expect(document.activeElement).toBe(button("사진 자르기"));
        expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:portrait.jpg");
    });
    it.each(["취소", "Escape"])("인코딩 중 %s하면 늦은 결과를 적용하지 않는다", async (path) => {
        let finish!: BlobCallback;
        const encode = canvas((cb) => { finish = cb; });
        await render();
        installInput();
        await open();
        const original = chosen[0];
        await loadImage();
        const apply = button("이 영역으로 자르기");
        await act(async () => { apply.click(); apply.click(); });
        expect(encode).toHaveBeenCalledTimes(1);
        expect(button("자르는 중…").disabled).toBe(true);
        if (path === "취소") await click("취소");
        else await key("Escape");
        await act(async () => finish(new Blob(["late"], { type: "image/jpeg" })));
        expect(chosen[0]).toBe(original);
        expect(host.querySelector("[data-preview]")).toBeNull();
        expect(document.body.style.overflow).toBe("clip");
    });
    it("파일 교체 실패는 완료로 위장하지 않고 원본 유지·재시도를 허용한다", async () => {
        canvas();
        vi.stubGlobal("DataTransfer", undefined);
        await render();
        installInput();
        await open();
        const original = chosen[0];
        await loadImage();
        await click("이 영역으로 자르기");
        expect(dialog()?.textContent).toContain("적용하지 못했어요");
        expect(chosen[0]).toBe(original);
        expect(button("이 영역으로 자르기").disabled).toBe(false);
        expect(document.body.style.overflow).toBe("hidden");
    });
    it.each(["null", "throw"])("캔버스 %s 실패도 처리 중 상태를 풀고 재시도할 수 있다", async (mode) => {
        const encode = canvas((cb) => { if (mode === "throw") throw new Error("canvas failed"); cb(null); });
        await render();
        installInput();
        await open();
        await loadImage();
        await click("이 영역으로 자르기");
        expect(dialog()?.textContent).toContain("자르지 못했어요");
        expect(button("이 영역으로 자르기").disabled).toBe(false);
        encode.mockImplementation((cb) => cb(new Blob(["retry"], { type: "image/jpeg" })));
        await click("이 영역으로 자르기");
        expect(dialog()).toBeNull();
    });
    it("이미지 디코딩 실패를 표시하고 자르기 실행을 허용하지 않는다", async () => {
        await render();
        installInput();
        await open();
        await act(async () => dialog()!.querySelector("img")!.dispatchEvent(new Event("error")));
        expect(dialog()?.textContent).toContain("이 사진을 읽지 못했어요");
        expect(button("이 영역으로 자르기").disabled).toBe(true);
    });
    it("사진 다운로드 중 닫으면 요청을 취소하고 늦은 blob URL을 만들지 않는다", async () => {
        let resolveBlob!: (blob: Blob) => void;
        const pending = new Promise<Blob>((resolve) => { resolveBlob = resolve; });
        const fetchMock = vi.fn().mockResolvedValue({ ok: true, blob: () => pending });
        vi.stubGlobal("fetch", fetchMock);
        await render(<Harness currentUrl="https://cdn.sanity.io/photo.jpg" />);
        installInput();
        await click("사진 자르기");
        const signal = fetchMock.mock.calls[0][1].signal as AbortSignal;
        await click("취소");
        expect(signal.aborted).toBe(true);
        await act(async () => resolveBlob(new Blob(["late"])));
        expect(URL.createObjectURL).not.toHaveBeenCalled();
    });
    it("상위 폼이 사라지면 인코딩 결과를 폐기하고 배경 잠금을 해제한다", async () => {
        let finish!: BlobCallback;
        canvas((cb) => { finish = cb; });
        await render();
        installInput();
        await open();
        await loadImage();
        const el = input(), original = chosen[0];
        await click("이 영역으로 자르기");
        await render(<p>다른 화면</p>);
        await act(async () => finish(new Blob(["late"])));
        expect(el.files?.[0]).toBe(original);
        expect(document.body.style.overflow).toBe("clip");
        expect(host.hasAttribute("inert")).toBe(false);
    });
});
