import { describe, expect, it } from "vitest";
import { dataset, projectId } from "@/sanity/env";
import { manageThumbnail } from "./manage-thumbnail";

describe("관리 목록 썸네일", () => {
    it.each([undefined, null, false, 1, [], {}, "broken", { asset: {} }, { asset: { _ref: "broken" } }, { asset: { _ref: 123 } }, { asset: { url: "https://other.example/photo.jpg" } }])("잘못된 사진 #%#은 목록을 깨뜨리지 않는다", (image) => {
        expect(manageThumbnail(image)).toBeNull();
    });
    it("정상 참조는 원본을 수정하지 않고 112px 정사각형으로 만든다", () => {
        const image = { _type: "image", asset: { _ref: "image-abcdef-3000x4000-png" } }; const before = JSON.stringify(image);
        const url = new URL(manageThumbnail(image)!);
        expect(url.origin + url.pathname).toBe(`https://cdn.sanity.io/images/${projectId}/${dataset}/abcdef-3000x4000.png`);
        expect(url.searchParams.get("w")).toBe("112"); expect(url.searchParams.get("h")).toBe("112"); expect(url.searchParams.get("fit")).toBe("crop");
        expect(JSON.stringify(image)).toBe(before);
    });
    it("기존 crop·hotspot을 빼지 않는다", () => {
        const image = { _type: "image", asset: { _ref: "image-abcdef-3000x4000-png" }, crop: { left: 0.1, right: 0.2, top: 0.05, bottom: 0.1 }, hotspot: { x: 0.3, y: 0.4, width: 0.2, height: 0.2 } };
        const before = JSON.stringify(image); expect(new URL(manageThumbnail(image)!).searchParams.get("rect")).toBeTruthy(); expect(JSON.stringify(image)).toBe(before);
    });
    it("에셋 ID·URL 형태를 지원하는 기존 SDK 계약은 유지한다", () => {
        expect(manageThumbnail("image-abcdef-300x400-jpg")).toBeTruthy();
        expect(manageThumbnail(`https://cdn.sanity.io/images/${projectId}/${dataset}/abcdef-300x400.jpg`)).toBeTruthy();
    });
});
