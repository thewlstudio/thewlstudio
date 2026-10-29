import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { uploadImageIfPresent, validateManageUploadForm } from "./manage-upload";
import { EMPTY_MANAGE_IMAGE, MAX_MANAGE_IMAGE_BYTES } from "./manage-image-policy";
import type { getWriteClient } from "@/sanity/lib/writeClient";

const upload = vi.fn();
const client = { assets: { upload } } as unknown as ReturnType<typeof getWriteClient>;
const photo = (size = 5, name = "photo.png", type = "image/png") => new File([new Uint8Array(size)], name, { type });
beforeEach(() => { upload.mockReset(); upload.mockResolvedValue({ _id: "image-test" }); vi.spyOn(console, "error").mockImplementation(() => {}); });
afterEach(() => vi.restoreAllMocks());

describe("공통 서버 이미지 업로드", () => {
    it.each([null, undefined, photo(0, "", "application/octet-stream")])("선택하지 않은 파일은 업로드하지 않고 null을 반환한다 #%#", async (value) => {
        expect(await uploadImageIfPresent(client, value)).toBeNull();
        expect(upload).not.toHaveBeenCalled();
    });
    it("Next 서버 액션이 만드는 미선택 파일(이름 'undefined')도 선택 안 함으로 본다", async () => {
        // Next의 멀티파트 해석기는 미선택 input을 new File([], undefined)로 만든다.
        const unselected = new File([], undefined as unknown as string);
        expect(unselected.name).toBe("undefined");
        expect(await uploadImageIfPresent(client, unselected)).toBeNull();
        const form = new FormData();
        form.set("imageFile", unselected);
        form.set("bgImageFile", photo(0, "", "application/octet-stream"));
        expect(() => validateManageUploadForm(form)).not.toThrow();
        expect(upload).not.toHaveBeenCalled();
    });
    it.each(["not-a-file", "", 0, false, {}, new Blob(["bytes"], { type: "image/png" })])("File이 아닌 값은 내부 TypeError 대신 다시 선택 안내를 반환한다 #%#", async (value) => {
        await expect(uploadImageIfPresent(client, value)).rejects.toThrow("다시 선택해 주세요");
        expect(upload).not.toHaveBeenCalled();
    });
    it("선택한 빈 파일은 조용히 생략하지 않는다", async () => {
        await expect(uploadImageIfPresent(client, photo(0))).rejects.toThrow(EMPTY_MANAGE_IMAGE);
        expect(upload).not.toHaveBeenCalled();
    });
    it.each(["text/plain", "application/pdf", ""])("이미지 MIME이 아닌 %s는 거부한다", async (type) => {
        await expect(uploadImageIfPresent(client, photo(5, "photo.png", type))).rejects.toThrow("이미지 파일만");
        expect(upload).not.toHaveBeenCalled();
    });
    it("장당 상한을 초과하면 파일 바이트를 읽기 전에 거부한다", async () => {
        const file = photo(MAX_MANAGE_IMAGE_BYTES + 1);
        const read = vi.spyOn(file, "arrayBuffer");
        await expect(uploadImageIfPresent(client, file)).rejects.toThrow("2.8MB 이하");
        expect(read).not.toHaveBeenCalled();
        expect(upload).not.toHaveBeenCalled();
    });
    it("상한과 같은 크기는 원본 이름·바이트로 이미지 엔드포인트에 한 번 전달한다", async () => {
        const file = photo(MAX_MANAGE_IMAGE_BYTES, "원본.png");
        expect(await uploadImageIfPresent(client, file)).toEqual({ _type: "image", asset: { _type: "reference", _ref: "image-test" } });
        expect(upload).toHaveBeenCalledTimes(1);
        expect(upload.mock.calls[0][0]).toBe("image");
        expect(upload.mock.calls[0][1]).toBeInstanceOf(Buffer);
        expect(upload.mock.calls[0][1].byteLength).toBe(MAX_MANAGE_IMAGE_BYTES);
        expect(upload.mock.calls[0][2]).toEqual({ filename: "원본.png" });
    });
    it.each(["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"])("기존 %s 입력을 임의로 변환하거나 형식 제한을 추가하지 않는다", async (type) => {
        await uploadImageIfPresent(client, photo(5, "photo", type));
        expect(upload).toHaveBeenCalledTimes(1);
    });
    it("API 오류는 한 번만 전송하고 원문을 노출하지 않는 안내로 바꾼다", async () => {
        upload.mockRejectedValue(Object.assign(new Error("private upstream details"), { statusCode: 422 }));
        await expect(uploadImageIfPresent(client, photo())).rejects.toThrow("사진을 올리지 못했어요");
        expect(upload).toHaveBeenCalledTimes(1);
        expect(console.error).toHaveBeenCalledExactlyOnceWith("[manage-upload] image upload failed", { statusCode: 422 });
        expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain("private upstream details");
    });
});

describe("업로드 전 전체 폼 검사", () => {
    it("실제 multipart 직렬화·역직렬화 뒤의 File도 동일하게 검증한다", async () => {
        const data = new FormData(); data.set("imageFile", photo(5, "multipart.png"));
        const parsed = await new Request("http://upload.test", { method: "POST", body: data }).formData();
        expect(() => validateManageUploadForm(parsed)).not.toThrow();
        await uploadImageIfPresent(client, parsed.get("imageFile"));
        expect(upload).toHaveBeenCalledTimes(1);
        expect(upload.mock.calls[0][2]).toEqual({ filename: "multipart.png" });
    });
    it.each(["imageFile", "bgImageFile", "modalImageFile", "linkIconFile_0", "blockImage_new-1", "spaceImage_new-1"])("%s의 파일 자리에 문자열이 와도 업로드 전에 거부한다", (field) => {
        const data = new FormData(); data.set(field, "not-a-file");
        expect(() => validateManageUploadForm(data)).toThrow("다시 선택해 주세요");
    });
    it("뒤쪽 파일이 잘못되어도 앞쪽 파일의 바이트를 읽거나 업로드하지 않는다", () => {
        const file = photo(); const read = vi.spyOn(file, "arrayBuffer");
        const data = new FormData(); data.set("imageFile", file); data.set("modalImageFile", photo(4, "bad.txt", "text/plain"));
        expect(() => validateManageUploadForm(data)).toThrow("이미지 파일만");
        expect(read).not.toHaveBeenCalled(); expect(upload).not.toHaveBeenCalled();
    });
    it("각 장은 상한 이하여도 전체 요청 예산을 넘으면 거부한다", () => {
        const data = new FormData(); data.append("imageFile", photo(1_900_000)); data.append("imageFile", photo(1_900_000));
        expect(() => validateManageUploadForm(data)).toThrow("한 번에 보내는");
        expect(upload).not.toHaveBeenCalled();
    });
    it("일반 텍스트와 빈 파일 입력은 보존하며 폼을 변경하지 않는다", () => {
        const data = new FormData(); data.set("name", "원문"); data.set("imageFile", photo(0, ""));
        const file = data.get("imageFile");
        expect(() => validateManageUploadForm(data)).not.toThrow();
        expect(data.get("name")).toBe("원문"); expect(data.get("imageFile")).toBe(file);
    });
});
