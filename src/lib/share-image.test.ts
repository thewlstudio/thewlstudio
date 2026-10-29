import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { PUBLIC_LOGO, PUBLIC_SHARE_IMAGE } from "./public-metadata";

/** JPEG 헤더(SOF 마커)에서 가로·세로를 읽는다. */
function jpegSize(file: string): { width: number; height: number } {
    const buf = readFileSync(file);
    let i = 2;
    while (i < buf.length) {
        if (buf[i] !== 0xff) { i++; continue; }
        const marker = buf[i + 1];
        if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
        i += 2 + buf.readUInt16BE(i + 2);
    }
    throw new Error("JPEG 크기를 읽지 못했어요");
}

describe("공유 이미지 파일", () => {
    it("선언한 크기가 실제 파일 크기와 같다(공유 이미지와 로고)", () => {
        expect(jpegSize("public" + PUBLIC_SHARE_IMAGE.url)).toEqual({ width: PUBLIC_SHARE_IMAGE.width, height: PUBLIC_SHARE_IMAGE.height });
        expect(jpegSize("public" + PUBLIC_LOGO.url)).toEqual({ width: PUBLIC_LOGO.width, height: PUBLIC_LOGO.height });
    });
    it("공유 이미지는 큰 카드 권장 비율(약 1.91:1)이고 용량이 작다", () => {
        expect(PUBLIC_SHARE_IMAGE.width / PUBLIC_SHARE_IMAGE.height).toBeCloseTo(1.91, 1);
        expect(readFileSync("public" + PUBLIC_SHARE_IMAGE.url).length).toBeLessThan(300_000);
    });
});
