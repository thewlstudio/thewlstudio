// @vitest-environment jsdom
import { act, StrictMode, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as upload from "./imageUpload";
import { useImageInput } from "./useImageInput";
import { useGuardedForm } from "./useGuardedForm";
import { FieldErrorsProvider, InlineError } from "./FormParts";

let root: Root;
let host: HTMLDivElement;
const save = vi.fn();
const notified = vi.fn();
const file = (name: string) => new File([name], name, { type: "image/jpeg" });
function deferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (error: Error) => void;
    const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
    return { promise, resolve, reject };
}

function Harness() {
    const image = useImageInput(notified);
    const guard = useGuardedForm(null, save, false);
    return <FieldErrorsProvider value={guard.clientErrors}>
        <form data-manage-form onSubmit={guard.validateOnSubmit} onChange={guard.markDirty}>
            <input id="photo" type="file" name="imageFile" onChange={image.onChange} />
            <InlineError id="photo" />
            {image.preview && <span data-preview>{image.preview}</span>}
            {image.error && <p data-image-error>{image.error}</p>}
            {image.processing && <p data-processing>준비 중</p>}
            <button>저장</button>
        </form>
    </FieldErrorsProvider>;
}

async function render(node: ReactNode = <Harness />) { await act(async () => root.render(node)); }
function input() { return host.querySelector<HTMLInputElement>("input")!; }
function picker(el = input()) {
    // 브라우저 파일 선택/비우기와 FileList 교체를 모사한다 (jsdom에는 DataTransfer가 없다).
    let files: File[] = [];
    Object.defineProperty(el, "files", { configurable: true, get: () => files, set: (value: File[]) => { files = value; } });
    Object.defineProperty(el, "value", { configurable: true, get: () => files[0]?.name ?? "", set: (value: string) => { if (!value) files = []; } });
    return async (next?: File) => {
        files = next ? [next] : [];
        await act(async () => el.dispatchEvent(new Event("change", { bubbles: true })));
    };
}
async function submit() { await act(async () => host.querySelector("form")!.requestSubmit()); }

beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    vi.clearAllMocks();
    vi.stubGlobal("DataTransfer", class {
        files: File[] = [];
        items = { add: (file: File) => this.files.push(file) };
    });
    URL.createObjectURL = vi.fn((blob: Blob) => `blob:${(blob as File).name}`);
    URL.revokeObjectURL = vi.fn();
    HTMLElement.prototype.scrollIntoView = vi.fn();
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
});
afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe("관리 사진 선택", () => {
    it("늦게 준비된 이전 사진은 최신 선택과 미리보기를 덮어쓰지 않는다", async () => {
        const first = deferred<{ file: File }>();
        const second = deferred<{ file: File }>();
        vi.spyOn(upload, "prepareImageFile").mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
        await render();
        const choose = picker();
        const a = file("A.jpg"), b = file("B.jpg"), smallB = file("B-small.jpg");
        await choose(a);
        await choose(b);
        await act(async () => second.resolve({ file: smallB }));
        expect(input().files?.[0]).toBe(smallB);
        expect(host.querySelector("[data-preview]")?.textContent).toBe("blob:B-small.jpg");
        await act(async () => first.resolve({ file: file("A-small.jpg") }));
        expect(input().files?.[0]).toBe(smallB);
        expect(host.querySelector("[data-preview]")?.textContent).toBe("blob:B-small.jpg");
        expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    });
    it("오래된 실패가 새 선택을 비우거나 새 사진의 처리 잠금을 풀지 않는다", async () => {
        const first = deferred<{ error: string }>();
        const second = deferred<{ file: File }>();
        vi.spyOn(upload, "prepareImageFile").mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
        await render();
        const choose = picker();
        await choose(file("A.jpg"));
        const b = file("B.jpg");
        await choose(b);
        await act(async () => first.resolve({ error: "이전 선택 실패" }));
        expect(input().files?.[0]).toBe(b);
        expect(input().dataset.imageProcessing).toBe("true");
        expect(host.querySelector("[data-image-error]")).toBeNull();
        await act(async () => second.resolve({ file: b }));
        expect(input().dataset.imageProcessing).toBeUndefined();
    });
    it("사진 준비 중 저장과 Ctrl+S를 차단하고 준비 후 다시 저장할 수 있다", async () => {
        const pending = deferred<{ file: File }>();
        vi.spyOn(upload, "prepareImageFile").mockReturnValue(pending.promise);
        await render();
        const chosen = file("ready.jpg");
        await picker()(chosen);
        await submit();
        await act(async () => window.dispatchEvent(new KeyboardEvent("keydown", { key: "s", ctrlKey: true, bubbles: true })));
        expect(save).not.toHaveBeenCalled();
        expect(host.textContent).toContain("사진 준비를 마친 뒤");
        await act(async () => pending.resolve({ file: chosen }));
        await submit();
        expect(save).toHaveBeenCalledTimes(1);
    });
    it("필수가 아닌 사진도 처리 실패를 고치기 전에는 조용히 저장하지 않는다", async () => {
        vi.spyOn(upload, "prepareImageFile").mockResolvedValueOnce({ error: "사진 용량 초과" });
        await render();
        const choose = picker();
        await choose(file("bad.jpg"));
        await submit();
        expect(save).not.toHaveBeenCalled();
        expect(input().files).toHaveLength(0);
        expect(host.textContent).toContain("사진 용량 초과");
        await choose(file("good.jpg"));
        await submit();
        expect(save).toHaveBeenCalledTimes(1);
    });
    it("변환 파일 교체 실패 시 잘못된 미리보기를 만들지 않고 입력을 비운다", async () => {
        vi.spyOn(upload, "prepareImageFile").mockResolvedValue({ file: file("small.jpg") });
        vi.stubGlobal("DataTransfer", undefined);
        await render();
        await picker()(file("original.jpg"));
        expect(input().files).toHaveLength(0);
        expect(input().dataset.imageError).toContain("이 브라우저");
        expect(URL.createObjectURL).not.toHaveBeenCalled();
        await submit();
        expect(save).not.toHaveBeenCalled();
    });
    it("예외도 오류로 표시하고 처리 잠금을 해제한다", async () => {
        vi.spyOn(upload, "prepareImageFile").mockRejectedValue(new Error("decode failed"));
        await render();
        await picker()(file("bad.jpg"));
        expect(input().dataset.imageProcessing).toBeUndefined();
        expect(input().files).toHaveLength(0);
        expect(host.querySelector("p[data-image-error]")?.textContent).toContain("다시 골라");
    });
    it("미리보기 URL은 교체·선택 해제·폼 해제 때 반환한다", async () => {
        await render(<StrictMode><Harness /></StrictMode>);
        const choose = picker();
        await choose(file("A.jpg"));
        await choose(file("B.jpg"));
        expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:A.jpg");
        await choose();
        expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:B.jpg");
        await choose(file("C.jpg"));
        await render(<p>폼 닫힘</p>);
        expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:C.jpg");
    });
    it("폼이 사라진 뒤 준비가 끝나도 파일 교체·URL 생성·부모 알림을 하지 않는다", async () => {
        const pending = deferred<{ file: File }>();
        vi.spyOn(upload, "prepareImageFile").mockReturnValue(pending.promise);
        await render();
        const el = input();
        const chosen = file("late.jpg");
        await picker()(chosen);
        notified.mockClear();
        await render(<p>다른 폼</p>);
        await act(async () => pending.resolve({ file: file("late-small.jpg") }));
        expect(el.files?.[0]).toBe(chosen);
        expect(URL.createObjectURL).not.toHaveBeenCalled();
        expect(notified).not.toHaveBeenCalled();
    });
});

describe("이미지 변환 자원·실제 파일 교체", () => {
    it("선택한 빈 사진은 변환·미리보기 이전에 오류로 알린다", async () => {
        const result = await upload.prepareImageFile(new File([], "empty.png", { type: "image/png" }));
        expect(result).toEqual({ error: "사진 파일이 비어 있어요. 다른 사진을 골라 주세요." });
    });
    it.each([2_800_000, 2_800_001])("줄일 수 없는 사진의 %s바이트 경계를 서버와 같게 적용한다", async (size) => {
        const result = await upload.prepareImageFile(new File([new Uint8Array(size)], "image.gif", { type: "image/gif" }));
        if (size === 2_800_000) expect("file" in result).toBe(true);
        else expect(result).toMatchObject({ error: expect.stringContaining("2.8MB 이하") });
    });
    const large = () => new File([new Uint8Array(1_300_000)], "large.jpg", { type: "image/jpeg" });
    it.each(["no-context", "draw-error", "null-blob", "success"])("%s — 디코딩한 비트맵을 반드시 닫는다", async (mode) => {
        const close = vi.fn();
        vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue({ width: 5000, height: 4000, close }));
        vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(mode === "no-context" ? null : {
            fillRect: vi.fn(), drawImage: () => { if (mode === "draw-error") throw new Error("draw failed"); },
        } as unknown as CanvasRenderingContext2D);
        vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((cb) => cb(mode === "null-blob" ? null : new Blob(["small"], { type: "image/jpeg" })));
        const result = await upload.prepareImageFile(large());
        expect(close).toHaveBeenCalledTimes(1);
        expect("file" in result).toBe(true);
        if ("file" in result) expect(result.file.size).toBe(mode === "success" ? 5 : 1_300_000);
    });
    it("같은 파일은 DataTransfer 없이도 성공하고 다른 파일 교체 실패는 false를 반환한다", async () => {
        await render();
        const chosen = file("original.jpg");
        await picker()(chosen);
        vi.stubGlobal("DataTransfer", undefined);
        expect(upload.replaceInputFile(input(), chosen)).toBe(true);
        expect(upload.replaceInputFile(input(), file("other.jpg"))).toBe(false);
        expect(input().files?.[0]).toBe(chosen);
    });
    it("브라우저가 FileList 교체를 무시한 경우도 실패로 알린다", async () => {
        await render();
        const original = file("original.jpg");
        Object.defineProperty(input(), "files", { configurable: true, get: () => [original], set: () => {} });
        expect(upload.replaceInputFile(input(), file("other.jpg"))).toBe(false);
    });
});
