import { describe, expect, it, vi } from "vitest";
import { sanitizeBlocks } from "./work-blocks-server";

const cases = [
    { label: "영상", block: { _key: "video", _type: "videoEmbedBlock", url: "https://example.com/DO_NOT_ECHO" }, existing: [] },
    { label: "오디오 제목", block: { _key: "audio", _type: "audioBlock", title: " ", artist: "가수" }, existing: [{ _key: "audio", _type: "audioBlock", title: "곡", artist: "가수", audioFile: { asset: { _ref: "file-original" } } }] },
    { label: "오디오 아티스트", block: { _key: "audio", _type: "audioBlock", title: "곡", artist: " " }, existing: [{ _key: "audio", _type: "audioBlock", title: "곡", artist: "가수", audioFile: { asset: { _ref: "file-original" } } }] },
    { label: "크레딧", block: { _key: "credit", _type: "creditGridBlock", sections: [{ _key: "group", title: "제목", items: [{ _key: "item", role: "역할", value: "값", linkText: "링크", linkUrl: "javascript:DO_NOT_ECHO" }] }] }, existing: [] },
];
describe("Works 의미 검증의 업로드 전 완료", () => {
    it.each(cases)("뒤쪽 $label 오류면 앞쪽 사진 업로드도 시작하지 않는다", async ({ block, existing }) => {
        const payload = [{ _key: "new-photo", _type: "imageBlock", caption: "사진" }, block];
        const before = JSON.stringify([payload, existing]); const upload = vi.fn(async () => ({ asset: { _ref: "image-uploaded" } }));
        const result = await sanitizeBlocks(payload, existing, upload);
        expect(result).toHaveProperty("error"); expect(upload).not.toHaveBeenCalled();
        expect(JSON.stringify(result)).not.toContain("DO_NOT_ECHO"); expect(JSON.stringify([payload, existing])).toBe(before);
    });
    it("비어 있는 새 이미지·영상 카드를 제외하는 기존 계약은 유지한다", async () => {
        const upload = vi.fn(async () => null);
        expect(await sanitizeBlocks([{ _key: "new-photo", _type: "imageBlock", caption: "" }, { _key: "video", _type: "videoEmbedBlock", url: "" }], [], upload)).toEqual({ blocks: [] });
    });
});
