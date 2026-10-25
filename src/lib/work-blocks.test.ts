import { describe, expect, it } from "vitest";
import { sanitizeBlocks } from "./work-blocks-server";
import { toPayload, toState } from "./work-blocks";

type Raw = Record<string, unknown>;
const noUpload = async () => null;

/** 운영 데이터(작업물 상세)와 같은 모양의 예시 */
const existing: Raw[] = [
    { _key: "d1", _type: "descriptionBlock", paragraphs: ["첫 문단\n둘째 줄", "둘째 문단/n표기"] },
    {
        _key: "c1",
        _type: "creditGridBlock",
        sections: [
            {
                _key: "s1",
                title: "Staff",
                items: [
                    { _key: "i1", role: "Vocal by", value: "백광흠" },
                    { _key: "i2", role: "Mixed by", value: "WL", linkText: "@wl", linkUrl: "https://www.instagram.com/wl/" },
                    { _key: "i3", value: "Special Thanks" },
                ],
            },
        ],
    },
    { _key: "t1", _type: "tracklistBlock", tracks: [{ _key: "k1", title: "1. 너와", description: "가사\n둘째 줄" }] },
    { _key: "m1", _type: "signatureMessageBlock", paragraphs: ["감사합니다"], signature: "- WL" },
    { _key: "f1", _type: "freeformTextBlock", content: [{ _type: "block", children: [] }] },
    { _key: "a1", _type: "audioBlock", title: "T", artist: "A", audioFile: { _type: "file", asset: { _ref: "file-1" } } },
];

const canon = (v: unknown): unknown =>
    Array.isArray(v) ? v.map(canon) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon((v as Raw)[k])])) : v;

describe("sanitizeBlocks — 작업물 상세 블록 저장 검증", () => {
    it("편집 상태로 바꿨다가 그대로 저장해도 내용이 달라지지 않는다 (무변경 저장은 무손실)", async () => {
        const payload = JSON.parse(JSON.stringify(toPayload(toState(existing))));
        const r = await sanitizeBlocks(payload, existing, noUpload);
        expect("blocks" in r && canon(r.blocks)).toEqual(canon(existing));
    });

    it("문단 안의 줄바꿈과 예전 '/n' 표기를 그대로 보존한다", async () => {
        const r = await sanitizeBlocks(toPayload(toState(existing)), existing, noUpload);
        const d = "blocks" in r ? (r.blocks[0] as Raw) : {};
        expect(d.paragraphs).toEqual(["첫 문단\n둘째 줄", "둘째 문단/n표기"]);
    });

    it("편집 불가 블록(자유서식)은 클라이언트가 보낸 값을 무시하고 기존 문서의 것을 그대로 쓴다", async () => {
        const payload = [{ _key: "f1", _type: "freeformTextBlock", content: "해킹 시도", preserved: true }];
        const r = await sanitizeBlocks(payload, [existing[4]], noUpload);
        expect("blocks" in r && r.blocks).toEqual([existing[4]]);
    });

    it("보존 블록이 빠진 오래된 화면의 저장은 거부한다 (실수로 지워지는 것 방지)", async () => {
        const r = await sanitizeBlocks([], [existing[4]], noUpload);
        expect("error" in r).toBe(true);
    });

    it("빈 문단·빈 블록은 저장할 때 빠진다", async () => {
        const payload = [
            { _key: "new-1", _type: "descriptionBlock", paragraphs: ["", "   "] },
            { _key: "new-2", _type: "tracklistBlock", tracks: [{ _key: "new-3", title: "", description: "" }] },
            { _key: "new-4", _type: "descriptionBlock", paragraphs: ["남는 문단", ""] },
        ];
        const r = await sanitizeBlocks(payload, [], noUpload);
        expect("blocks" in r && r.blocks).toHaveLength(1);
        expect("blocks" in r && (r.blocks[0] as Raw).paragraphs).toEqual(["남는 문단"]);
    });

    it("새로 만든 항목('new-…' 임시 키)은 서버가 진짜 키를 새로 발급한다", async () => {
        const r = await sanitizeBlocks([{ _key: "new-x", _type: "descriptionBlock", paragraphs: ["a"] }], [], noUpload);
        const key = "blocks" in r ? ((r.blocks[0] as Raw)._key as string) : "";
        expect(key).toBeTruthy();
        expect(key.startsWith("new-")).toBe(false);
    });

    describe("이미지 블록", () => {
        const img = { _type: "image", asset: { _type: "reference", _ref: "image-old" }, hotspot: { x: 0.5 } };
        const prev: Raw[] = [{ _key: "i1", _type: "imageBlock", image: img, caption: "옛 캡션" }];

        it("새 파일이 없으면 기존 사진(핫스팟 포함)을 유지하고 캡션만 바꾼다", async () => {
            const r = await sanitizeBlocks([{ _key: "i1", _type: "imageBlock", caption: "새 캡션" }], prev, noUpload);
            expect("blocks" in r && r.blocks).toEqual([{ _key: "i1", _type: "imageBlock", image: img, caption: "새 캡션" }]);
        });

        it("새 파일이 올라오면 그 사진으로 교체한다", async () => {
            const up = async (k: string) => (k === "i1" ? { _type: "image", asset: { _ref: "image-new" } } : null);
            const r = await sanitizeBlocks([{ _key: "i1", _type: "imageBlock", caption: "" }], prev, up);
            const out = "blocks" in r ? (r.blocks[0] as Raw) : {};
            expect((out.image as Raw).asset).toEqual({ _ref: "image-new" });
            expect("caption" in out).toBe(false);
        });

        it("사진이 없는 새 이미지 블록은 버린다", async () => {
            const r = await sanitizeBlocks([{ _key: "new-9", _type: "imageBlock", caption: "사진 없음" }], [], noUpload);
            expect("blocks" in r && r.blocks).toEqual([]);
        });
    });

    describe("유튜브 블록", () => {
        it("공개 화면에서 실제로 영상이 나오는 주소만 받는다", async () => {
            // (http 주소도 받는다: 공개 화면은 영상 번호만 뽑아 https 임베드를 직접 만들기 때문에 안전하다)
            for (const url of ["https://youtu.be/R86SFBXqEdM", "https://www.youtube.com/watch?v=R86SFBXqEdM", "https://www.youtube.com/embed/R86SFBXqEdM", "http://youtu.be/R86SFBXqEdM"]) {
                const r = await sanitizeBlocks([{ _key: "v", _type: "videoEmbedBlock", url }], [], noUpload);
                expect("blocks" in r && r.blocks).toHaveLength(1);
            }
        });

        it.each(["https://example.com/x", "javascript:alert(1)", "ftp://youtu.be/R86SFBXqEdM"])("거부: %s", async (url) => {
            const r = await sanitizeBlocks([{ _key: "v", _type: "videoEmbedBlock", url }], [], noUpload);
            expect("error" in r).toBe(true);
        });

        it("주소가 비어 있으면 블록만 빠지고 저장은 된다", async () => {
            const r = await sanitizeBlocks([{ _key: "v", _type: "videoEmbedBlock", url: "" }], [], noUpload);
            expect("blocks" in r && r.blocks).toEqual([]);
        });
    });

    describe("크레딧 링크", () => {
        const block = (linkUrl: string) => [{ _key: "c", _type: "creditGridBlock", sections: [{ _key: "s", title: "T", items: [{ _key: "i", role: "R", value: "V", linkUrl }] }] }];

        it("http(s) 주소만 허용한다", async () => {
            expect("blocks" in (await sanitizeBlocks(block("https://a.com/x"), [], noUpload))).toBe(true);
            expect("error" in (await sanitizeBlocks(block("javascript:alert(1)"), [], noUpload))).toBe(true);
            expect("error" in (await sanitizeBlocks(block("not a url"), [], noUpload))).toBe(true);
        });
    });

    describe("오디오 블록", () => {
        it("제목·아티스트만 바꾸고 파일은 기존 것을 유지한다", async () => {
            const r = await sanitizeBlocks([{ _key: "a1", _type: "audioBlock", title: "새 제목", artist: "새 아티스트" }], [existing[5]], noUpload);
            const out = "blocks" in r ? (r.blocks[0] as Raw) : {};
            expect(out.title).toBe("새 제목");
            expect(out.audioFile).toEqual((existing[5] as Raw).audioFile);
        });

        it("제목이나 아티스트가 비면 거부한다", async () => {
            const r = await sanitizeBlocks([{ _key: "a1", _type: "audioBlock", title: "", artist: "x" }], [existing[5]], noUpload);
            expect("error" in r).toBe(true);
        });

        it("기존에 없던 오디오 블록은 만들지 않는다 (파일 업로드는 /admin 전용)", async () => {
            const r = await sanitizeBlocks([{ _key: "new-1", _type: "audioBlock", title: "x", artist: "y" }], [], noUpload);
            expect("blocks" in r && r.blocks).toEqual([]);
        });
    });

    it("블록 개수 상한을 넘으면 거부한다", async () => {
        const many = Array.from({ length: 31 }, (_, i) => ({ _key: `new-${i}`, _type: "descriptionBlock", paragraphs: ["a"] }));
        expect("error" in (await sanitizeBlocks(many, [], noUpload))).toBe(true);
    });

    it("배열이 아닌 입력은 거부한다", async () => {
        expect("error" in (await sanitizeBlocks("x", [], noUpload))).toBe(true);
        expect("error" in (await sanitizeBlocks(null, [], noUpload))).toBe(true);
    });
});
